const { DataBase, Chat } = require('../../storage/dataBase/DataBase');
const { Schedule, GetOptions, ScheduleStates } = require('../../storage/dataBase/TablesClasses/Schedule');
const { TrelloManager } = require('@alordash/node-js-trello');
const utils = require('./utilities');

/**
 * @param {Schedule} schedule 
 * @param {TrelloManager} trelloManager 
 */
async function RemoveTrelloBoard(schedule, trelloManager) {
   if (typeof (schedule.trello_card_id) != 'undefined' && schedule.trello_card_id != null) {
      trelloManager.DeleteCard(schedule.trello_card_id);
   }
}

/**
 * @param {*} bot 
 * @param {Array.<Schedule>} schedule 
 */
async function RemoveReminders(bot, schedules = []) {
   for (const schedule of schedules) {
      let chat = await DataBase.Chats.GetChatById(schedule.chatid);
      if (typeof (chat) != 'undefined' && chat.trello_list_id != null) {
         let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, chat.trello_token);
         let schedules = await DataBase.Schedules.GetSchedules(schedule.chatid, GetOptions.all, schedule.message_id);
         for (const schedule of schedules) {
            RemoveTrelloBoard(schedule, trelloManager);
         }
      }
   }

   await DataBase.Schedules.RemoveSchedules(schedules);

   for (const schedule of schedules) {
      let _chatid = utils.UnformatChatId(schedule.chatid);
      try {
         if (_chatid < 0 && schedule.state == ScheduleStates.pending) {
            bot.telegram.deleteMessage(_chatid, schedule.message_id);
         } else {
            bot.telegram.editMessageReplyMarkup(_chatid, schedule.message_id);
         }
      } catch (e) {
         console.log(e);
      }
   }
}

module.exports = {
   RemoveReminders
};