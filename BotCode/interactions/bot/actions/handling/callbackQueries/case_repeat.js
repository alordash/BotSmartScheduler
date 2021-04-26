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
async function CaseRepeat(ctx, db, tzPendingConfirmationUsers, pendingSchedules, invalidSchedules, chatID, user, language, replies) {
   let hasCaption = false;
   let msgText = ctx.callbackQuery.message.text;
   if (typeof (msgText) == 'undefined') {
      hasCaption = true;
      msgText = ctx.callbackQuery.message.caption;
   }
   let text = msgText.match(/"[\S\s]+"/);
   text = text[0].substring(1, text[0].length - 1);
   let username = 'none';
   if (chatID[0] === '_') {
      username = ctx.from.username;
   }
   let file_id = utils.GetAttachmentId(ctx.callbackQuery.message);
   let schedulesCount = await db.GetSchedulesCount(chatID);
   let target_date = Date.now() + global.repeatScheduleTime;
   let schedule = new Schedule(chatID, schedulesCount, text, username, target_date, 0, 0, file_id);
   let tz = user.tz;

   try {
      await db.AddSchedule(schedule);
      let newText = text + '\r\n' + replies.remindSchedule + ' <b>' + Format.FormDateStringFormat(new Date(target_date + tz * 1000), language, false) + '</b>';
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