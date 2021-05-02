const Extra = require('telegraf/extra');
const { Languages, LoadReplies } = require('../../../static/replies/repliesLoader');
const Format = require('../../../../processing/formatting');
const { DataBase, Schedule, User, Chat } = require('../../../../../storage/dataBase/DataBase');
const { TrelloManager } = require('@alordash/node-js-trello');
const utils = require('../../utilities');
const { StartTimeZoneDetermination } = require('../../technical');
const kbs = require('../../../static/replies/keyboards');
const { BotReply } = require('../../replying');

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
async function CaseCancel(ctx, tzPendingConfirmationUsers, invalidSchedules, trelloPendingConfirmationUsers, chatID, user, language, replies) {
   utils.ClearPendingConfirmation(tzPendingConfirmationUsers, trelloPendingConfirmationUsers, ctx.from.id);
   let text = replies.cancelReponse;
   if (typeof (user) == 'undefined' || typeof(user.id) == 'undefined') {
      text += '\r\n' + replies.tzCancelWarning;
   }
   try {
      let kb = await kbs.LogicalListKeyboard(language, chatID);
      kb.parse_mode = 'HTML';
      ctx.answerCbQuery();
      await ctx.deleteMessage();
      BotReply(ctx, text, kb);
   } catch (e) {
      console.error(e);
   }
}

module.exports = CaseCancel;