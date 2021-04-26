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
async function CaseUnsubscribe(ctx, db, tzPendingConfirmationUsers, pendingSchedules, invalidSchedules, chatID, user, language, replies) {
   try {
      await db.SetUserSubscription(ctx.from.id, false);
   } catch (e) {
      console.log(e);
   }
}

module.exports = CaseUnsubscribe;