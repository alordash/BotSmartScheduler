const Extra = require('telegraf/extra');
const { Languages, LoadReplies } = require('../../../static/replies/repliesLoader');
const Format = require('../../../../processing/formatting');
const { DataBase, User, Chat } = require('../../../../../storage/dataBase/DataBase');
const { Schedule, GetOptions } = require('../../../../../storage/dataBase/TablesClasses/Schedule');
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
async function CaseConfirm(ctx, tzPendingConfirmationUsers, invalidSchedules, trelloPendingConfirmationUsers, chatID, user, language, replies) {
   let message_id = ctx.update.callback_query.message.message_id;
   let schedules = await DataBase.Schedules.GetSchedules(chatID, GetOptions.draft, message_id);
   try {
      let schedulesCount = await DataBase.Schedules.GetSchedulesCount(chatID, GetOptions.valid);
      if (schedules.length > 0) {
         await DataBase.Schedules.ConfirmSchedules(schedules);
      }
      let text = '';
      let tz = user.tz;
      for (let schedule of schedules) {
         schedule.num = ++schedulesCount;
         text += `${await Format.FormStringFormatSchedule(schedule, tz, language, true, true)}\r\n`;
      }
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