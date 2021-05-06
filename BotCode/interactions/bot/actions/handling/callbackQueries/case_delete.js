const Extra = require('telegraf/extra');
const { Languages, LoadReplies } = require('../../../static/replies/repliesLoader');
const Format = require('../../../../processing/formatting');
const { DataBase, User, Chat } = require('../../../../../storage/dataBase/DataBase');
const { Schedule, GetOptions, ScheduleStates } = require('../../../../../storage/dataBase/TablesClasses/Schedule');
const { TrelloManager } = require('@alordash/node-js-trello');
const utils = require('../../../../processing/utilities');
const { StartTimeZoneDetermination } = require('../../technical');
const { RemoveReminders } = require('../../../../processing/remindersOperations');

/**
 * @param {*} ctx 
 * @param {Array.<Number>} tzPendingConfirmationUsers 
 * @param {Array.<String>} trelloPendingConfirmationUsers 
 * @param {String} chatID 
 * @param {User} user 
 * @param {Languages} language 
 * @param {*} replies 
 */
async function CaseDelete(ctx, tzPendingConfirmationUsers, trelloPendingConfirmationUsers, chatID, user, language, replies) {
   let message_id = ctx.update.callback_query.message.message_id;
   try {
      let schedules = await DataBase.Schedules.GetSchedules(chatID, GetOptions.draft, message_id);
      await RemoveReminders(ctx, schedules);
   } catch (e) {
      console.log(e);
   }
}

module.exports = CaseDelete;