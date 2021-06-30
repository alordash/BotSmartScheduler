const Extra = require('telegraf/extra');
const { Languages, LoadReplies } = require('../../../static/replies/repliesLoader');
const Format = require('../../../../processing/formatting');
const { DataBase, User, Chat } = require('../../../../../storage/dataBase/DataBase');
const { Schedule, GetOptions, ScheduleStates } = require('../../../../../storage/dataBase/TablesClasses/Schedule');
const { TrelloManager } = require('@alordash/node-js-trello');
const utils = require('../../../../processing/utilities');
const { StartTimeZoneDetermination } = require('../../technical');

/**
 * @param {*} ctx 
 * @param {Array.<Number>} tzPendingConfirmationUsers
 * @param {Array.<String>} trelloPendingConfirmationUsers 
 * @param {String} chatID 
 * @param {User} user 
 * @param {Languages} language 
 * @param {*} replies 
 */
async function CaseRepeat(ctx, tzPendingConfirmationUsers, trelloPendingConfirmationUsers, chatID, user, language, replies) {
   let schedules = await DataBase.Schedules.GetSchedules(chatID, GetOptions.draft, ctx.callbackQuery.message.message_id, true);
   if (schedules.length == 0) {
      return 0;
   }
   let hasCaption = typeof (ctx.callbackQuery.message.text) == 'undefined' ? true : false;
   let schedule = schedules[0];
   let text = schedule.text;
   let tz = user.tz;

   try {
      await DataBase.Schedules.ConfirmSchedules([schedule]);
      let newText = `"${text}"\r\n${replies.remindSchedule} <b>${Format.FormDateStringFormat(new Date(schedule.target_date + tz * 1000), language, false)}</b>`;
      if (hasCaption) {
         ctx.editMessageCaption(newText, { parse_mode: 'HTML' });
      } else {
         ctx.editMessageText(newText, { parse_mode: 'HTML' });
      }
   } catch (e) {
      console.error(e);
   }
}

module.exports = CaseRepeat;