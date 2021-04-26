const Extra = require('telegraf/extra');
const { Languages, LoadReplies } = require('../../../static/replies/repliesLoader');
const Format = require('../../../../processing/formatting');
const { dbManagement, Schedule, User, Chat } = require('../../../../../storage/dataBase/db');
const { TrelloManager } = require('@alordash/node-js-trello');
const utils = require('../../utilities');
const { StartTimeZoneDetermination } = require('../../technical');

/**
 * @param {*} ctx 
 * @param {dbManagement} db 
 * @param {Array.<Number>} tzPendingConfirmationUsers
 * @param {Array.<Array.<Schedule>>} pendingSchedules 
 * @param {Array.<Schedule>} invalidSchedules 
 * @param {String} chatID 
 * @param {User} user 
 * @param {Languages} language 
 * @param {*} replies 
 */
async function CaseStartTZ(ctx, db, tzPendingConfirmationUsers, pendingSchedules, invalidSchedules, chatID, user, language, replies) {
   try {
      ctx.from.language_code = language;
      ctx.editMessageReplyMarkup(Extra.markup((m) =>
         m.inlineKeyboard([]).removeKeyboard()
      ));
      StartTimeZoneDetermination(ctx, db, tzPendingConfirmationUsers);
   } catch (e) {
      console.error(e);
   }
}

module.exports = CaseStartTZ;