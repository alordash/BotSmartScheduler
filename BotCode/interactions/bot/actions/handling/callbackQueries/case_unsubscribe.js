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
 async function CaseUnsubscribe(ctx, tzPendingConfirmationUsers, invalidSchedules, trelloPendingConfirmationUsers, chatID, user, language, replies) {
   try {
      await DataBase.Users.SetUserSubscription(ctx.from.id, false);
   } catch (e) {
      console.log(e);
   }
}

module.exports = CaseUnsubscribe;