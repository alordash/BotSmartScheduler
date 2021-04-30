const Extra = require('telegraf/extra');
const { Languages, LoadReplies } = require('../../../static/replies/repliesLoader');
const Format = require('../../../../processing/formatting');
const { DataBase, Schedule, User, Chat } = require('../../../../../storage/dataBase/DataBase');
const { TrelloManager } = require('@alordash/node-js-trello');
const utils = require('../../utilities');
const { StartTimeZoneDetermination } = require('../../technical');
const CallbackQueryCases = require('./callbackQueryCases');

/**
 * @param {*} ctx 
 * @param {Array.<Number>} tzPendingConfirmationUsers
 * @param {Array.<Array.<Schedule>>} pendingSchedules 
 * @param {Array.<Schedule>} invalidSchedules 
 * @param {Array.<String>} trelloPendingConfirmationUsers 
 */
async function HandleCallbackQueries(ctx, tzPendingConfirmationUsers, pendingSchedules, invalidSchedules, trelloPendingConfirmationUsers) {
   let data = ctx.callbackQuery.data;
   console.log(`got callback_query, data: "${data}"`);
   let chatID = utils.FormatChatId(ctx.callbackQuery.message.chat.id);
   const user = await DataBase.Users.GetUserById(ctx.from.id);
   const language = user.lang;
   const replies = LoadReplies(language);
   const args = [...arguments, chatID, user, language, replies];

   for(const callbackQueryCase of CallbackQueryCases) {
      if(data == callbackQueryCase.name) {
         callbackQueryCase.callback(...args);
         break;
      }
   }
   
   try {
      ctx.answerCbQuery();
   } catch (e) {
      console.error(e);
   }
}

module.exports = HandleCallbackQueries;