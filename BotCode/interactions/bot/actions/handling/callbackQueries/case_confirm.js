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
 async function CaseConfirm(ctx, db, tzPendingConfirmationUsers, pendingSchedules, invalidSchedules, chatID, user, language, replies) {
   let schedules = pendingSchedules[chatID];
   try {
      let schedulesCount = await db.GetSchedulesCount(chatID);
      if (typeof (pendingSchedules[chatID]) != 'undefined' && pendingSchedules[chatID].length > 0) {
         await db.AddSchedules(chatID, pendingSchedules[chatID]);
      }
      let text = '';
      let tz = user.tz;
      for (let schedule of schedules) {
         schedule.id = ++schedulesCount;
         text += `${await Format.FormStringFormatSchedule(schedule, tz, language, true, true, db)}\r\n`;
      }
      pendingSchedules[chatID] = [];
      if (text.length > 0) {
         ctx.editMessageText(text, { parse_mode: 'HTML' });
      }
      ctx.editMessageReplyMarkup(Extra.markup((m) =>
         m.inlineKeyboard([]).removeKeyboard()
      ));
   } catch (e) {
      console.error(e);
   }
}

module.exports = CaseConfirm;