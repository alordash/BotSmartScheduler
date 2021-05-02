const Extra = require('telegraf/extra');
const { Languages, LoadReplies } = require('../../../static/replies/repliesLoader');
const Format = require('../../../../processing/formatting');
const { DataBase, Schedule, User, Chat } = require('../../../../../storage/dataBase/DataBase');
const { TrelloManager } = require('@alordash/node-js-trello');
const utils = require('../../utilities');
const { StartTimeZoneDetermination } = require('../../technical');

/**
 * @param {*} ctx 
 * @param {Array.<Number>} tzPendingConfirmationUsers 
 * @param {Array.<Schedule>} invalidSchedules 
 * @param {Array.<String>} trelloPendingConfirmationUsers 
 * @param {String} chatID 
 * @param {User} user 
 * @param {Languages} language 
 * @param {*} replies 
 */
async function CaseDelete(ctx, tzPendingConfirmationUsers, invalidSchedules, trelloPendingConfirmationUsers, chatID, user, language, replies) {
   let message_id = ctx.update.callback_query.message.message_id;
   try {
      let chat = await DataBase.Chats.GetChatById(chatID);
      if (typeof (chat) != 'undefined' && chat.trello_list_id != null) {
         let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, chat.trello_token);
         let schedules = await DataBase.Schedules.GetSchedules(chatID, Schedule.GetOptions.all, message_id);
         for (const schedule of schedules) {
            trelloManager.DeleteCard(schedule.trello_card_id);
         }
      }
      await DataBase.Schedules.RemoveSchedules(undefined, message_id);
   } catch (e) {
      console.log(e);
   }
   ctx.deleteMessage();
}

module.exports = CaseDelete;