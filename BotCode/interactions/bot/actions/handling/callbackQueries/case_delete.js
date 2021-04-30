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
 * @param {Array.<Array.<Schedule>>} pendingSchedules 
 * @param {Array.<Schedule>} invalidSchedules 
 * @param {Array.<String>} trelloPendingConfirmationUsers 
 * @param {String} chatID 
 * @param {User} user 
 * @param {Languages} language 
 * @param {*} replies 
 */
 async function CaseDelete(ctx, tzPendingConfirmationUsers, pendingSchedules, invalidSchedules, trelloPendingConfirmationUsers, chatID, user, language, replies) {
   try {
      let chat = await DataBase.Chats.GetChatById(chatID);
      if (typeof (chat) != 'undefined' && chat.trello_list_id != null) {
         let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, chat.trello_token);
         for (const schedule of pendingSchedules[chatID]) {
            trelloManager.DeleteCard(schedule.trello_card_id);
         }
      }
   } catch (e) {
      console.log(e);
   }
   pendingSchedules[chatID] = [];
   ctx.deleteMessage();
}

module.exports = CaseDelete;