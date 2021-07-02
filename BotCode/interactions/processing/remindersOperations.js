const { DataBase, Chat } = require('../../storage/dataBase/DataBase');
const { Schedule, GetOptions, ScheduleStates } = require('../../storage/dataBase/TablesClasses/Schedule');
const { TrelloManager } = require('@alordash/node-js-trello');
const { ExtractNicknames, GetUsersIDsFromNicknames } = require('./nicknamesExtraction');
const utils = require('./utilities');
const request = require('request-promise');
const path = require('path');

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
         let _schedules = await DataBase.Schedules.GetSchedules(schedule.chatid, GetOptions.all, schedule.message_id);
         for (const _schedule of _schedules) {
            RemoveTrelloBoard(_schedule, trelloManager);
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

/**
 * @param {*} bot 
 * @param {String} chatID 
 * @param {Number} message_id 
 * @returns {Boolean} 
 */
async function RemoveInvalidRemindersMarkup(bot, chatID, message_id = null) {
   if (message_id == null) {
      let invalidSchedules = await DataBase.Schedules.GetSchedules(chatID, GetOptions.invalid);
      let invalidSchedule = invalidSchedules[0];
      if (typeof (invalidSchedule) == 'undefined') {
         return false;
      }
      message_id = invalidSchedule.message_id;
   }
   let _chatid = utils.UnformatChatId(chatID);
   bot.telegram.editMessageReplyMarkup(_chatid, message_id);
   return true;
}

/**
 * @param {*} ctx 
 * @param {Schedule} schedule 
 * @param {Chat} chat 
 * @returns {Schedule} 
 */
async function AddScheduleToTrello(ctx, schedule, chat = null) {
   if (chat == null) {
      chat = await DataBase.Chats.GetChatById(schedule.chatid);
   }
   let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, chat.trello_token);

   let nickExtractionResult = ExtractNicknames(schedule.text);
   let ids = await GetUsersIDsFromNicknames(nickExtractionResult.nicks, trelloManager);
   schedule.text = nickExtractionResult.string;

   let text = schedule.text;
   if (text.length > global.MaxTrelloCardTextLength) {
      text = text.substring(0, global.MaxTrelloCardTextLength)
      text = `${text.substring(0, text.lastIndexOf(' '))}...`;
   }

   let card = await trelloManager.AddCard(chat.trello_list_id, text, schedule.text, 0, new Date(schedule.target_date), ids);

   if (schedule.file_id != undefined && schedule.file_id != '~') {
      let fileInfo;
      try {
         fileInfo = await ctx.telegram.getFile(schedule.file_id);
         let uri = `https://api.telegram.org/file/bot${process.env.SMART_SCHEDULER_TLGRM_API_TOKEN}/${fileInfo.file_path}`;
         let file = await request.get({ uri, encoding: null });
         let fileName = path.basename(fileInfo.file_path);
          await trelloManager.AddAttachment(card.id, file, { name: fileName });
      } catch (e) {
         console.log(e);
      }
   }

   if (typeof (card) != 'undefined') {
      schedule.trello_card_id = card.id;
   }
   schedule.max_date = 0;
   schedule.period_time = 0;
   await DataBase.Schedules.SetSchedule(schedule);
   return schedule;
}

module.exports = {
   RemoveReminders,
   RemoveInvalidRemindersMarkup,
   AddScheduleToTrello
};