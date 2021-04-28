const Markup = require('telegraf/markup');
const { Languages, LoadReplies } = require('../static/replies/repliesLoader');
const Format = require('../../processing/formatting');
const kbs = require('../static/replies/keyboards');
const { dbManagement, Schedule, User, Chat } = require('../../../storage/dataBase/db');
const { BotReply } = require('./replying');
const utils = require('./utilities');
const fixTimezone = require('../../processing/timeZone');

/**
 * @param {String} chatID 
 * @param {Number} tsOffset 
 * @param {dbManagement} db 
 * @param {Languages} language
 * @returns {Array.<String>}
 */
async function LoadSchedulesList(chatID, tsOffset, db, language) {
   let schedules = await db.ListSchedules(chatID);
   if (schedules.length > 0) {
      let answers = [];
      let answer = ``;
      schedules.sort((a, b) => a.target_date - b.target_date);
      for (let schedule of schedules) {
         schedule.target_date = +schedule.target_date;
         schedule.period_time = +schedule.period_time;
         schedule.max_date = +schedule.max_date;
         let newAnswer = `${await Format.FormStringFormatSchedule(schedule, tsOffset, language, false, true, db)}\r\n`;
         if (answer.length + newAnswer.length > global.MaxMessageLength) {
            answers.push(answer);
            answer = newAnswer;
         } else {
            answer += newAnswer;
         }
      }
      if (answer.length > 0) {
         answers.push(answer);
      }
      return answers;
   } else {
      const replies = LoadReplies(language);
      return [replies.listIsEmpty];
   }
}

/**
 * @param {*} ctx 
 * @param {dbManagement} db 
 * @param {Languages} 
 */
async function DeleteSchedules(ctx, db) {
   let chatID = utils.FormatChatId(ctx.chat.id)
   let msgText = ctx.message.text;
   const replies = LoadReplies(ctx.from.language_code);
   if (msgText.indexOf('all') == "/del ".length) {
      await db.ClearAllSchedules(chatID);
      BotReply(ctx, replies.cleared);
      return;
   }
   let nums = msgText.match(/[0-9]+/g);
   let ranges = msgText.match(/[0-9]+-[0-9]+/g);
   for (let i in nums) {
      nums[i] = parseInt(nums[i], 10);
   }
   for (let i in ranges) {
      let range = ranges[i];
      let index = range.indexOf('-');
      let leftNum = +range.substring(0, index);
      let rightNum = +range.substring(index + 1);
      if (leftNum > rightNum) {
         let t = leftNum;
         leftNum = rightNum;
         rightNum = t;
      }
      for (let j = leftNum; j <= rightNum && j - leftNum <= 10; j++) {
         nums.push(j);
      }
   }
   if (nums != null) {
      nums = nums.filter((item, pos) => {
         return nums.indexOf(item) == pos;
      });
      nums.sort((a, b) => a - b);

      let query = '';
      for (let i in nums) {
         let schedule = nums[i];
         query += `id = ${schedule} OR `;
      }
      query = query.substring(0, query.length - 4);
      await db.RemoveSchedules(chatID, query);
      await db.ReorderSchedules(chatID);
      let end = '';
      if (nums.length > 1) {
         end = 's';
      }
      try {
         BotReply(ctx, Format.Deleted(nums.join(', '), false, ctx.message.from.language_code));
      } catch (e) {
         console.error(e);
      }
      return;
   }
   try {
      BotReply(ctx, replies.invalidDelete);
   } catch (e) {
      console.error(e);
   }
}

/**
 * @param {*} ctx 
 * @param {dbManagement} db 
 * @param {Array.<Number>} tzPendingConfirmationUsers 
 */
async function StartTimeZoneDetermination(ctx, db, tzPendingConfirmationUsers) {
   let curTZ = fixTimezone(await db.GetUserTZ(ctx.from.id));
   let reply = '';
   const language = await db.GetUserLanguage(ctx.from.id);
   const replies = LoadReplies(language);
   if (curTZ !== 0) {
      reply = replies.tzDefined + '<b>' + Format.TzCurrent(curTZ) + '</b>\r\n';
   }
   let isPrivateChat = ctx.chat.id >= 0;
   if (isPrivateChat) {
      reply += replies.tzConfiguration + '\r\n' + replies.tzViaLoc + '\r\n' + replies.tzManually;
      try {
         return await BotReply(ctx, reply, kbs.TzDeterminationKeyboard(language));
      } catch (e) {
         console.error(e);
      }
   }
   if (tzPendingConfirmationUsers.indexOf(ctx.from.id) < 0) {
      tzPendingConfirmationUsers.push(ctx.from.id);
   }
   try {
      return await BotReply(ctx, replies.tzGroupChatConfiguration);
   } catch (e) {
      console.error(e);
   }
}

/**
 * @param {*} ctx 
 * @param {dbManagement} db 
 * @param {Array.<Number>} tzPendingConfirmationUsers 
 */
async function ConfrimTimeZone(ctx, db, tzPendingConfirmationUsers) {
   let userId = ctx.from.id;
   let matches = ctx.message.text.match(/(\+|-|–|—|)([0-9])+:([0-9])+/g);
   let hours, minutes, negative, ts;
   const replies = LoadReplies(ctx.from.language_code);
   if (matches != null) {
      //Parse tz from msg;
      let offset = matches[0];
      let index = offset.indexOf(':');
      hours = parseInt(offset.substring(0, index));
      negative = offset[0].match(/-|–|—/g) != null;
      minutes = parseInt(offset.substring(index + 1));
      console.log(`Determining tz: offset = ${offset}, hours = ${hours}, minutes = ${minutes}, ts = ${ts}`);
   } else {
      matches = ctx.message.text.match(/(\+|-|–|—|)([0-9])+/g);
      if (matches != null) {
         let offset = matches[0];
         hours = parseInt(offset);
         minutes = 0;
         negative = offset[0].match(/-|–|—/g) != null;
         console.log(`Determining tz from only hour option: offset = ${offset}, hours = ${hours}, minutes = ${minutes}, ts = ${ts}`);
      }
   }
   if (matches != null) {
      let ts = hours * 3600;
      ts += minutes * 60 * (negative ? -1 : 1);
      if (!await db.HasUserID(userId)) {
         await db.AddUser(new User(userId, ts, global.defaultUserLanguage));
      } else {
         await db.SetUserTz(userId, ts);
      }
      tzPendingConfirmationUsers.splice(tzPendingConfirmationUsers.indexOf(ctx.from.id), 1);
      try {
         const schedulesCount = await db.GetSchedulesCount(utils.FormatChatId(ctx.chat.id));
         BotReply(ctx, replies.tzDefined + '<b>' + Format.TzCurrent(ts) + '</b>\r\n',
            schedulesCount > 0 ? kbs.ListKeyboard(ctx.from.language_code) : Markup.removeKeyboard());
      } catch (e) {
         console.error(e);
      }
   } else {
      console.log(`Can't determine tz in "${ctx.message.text}"`);
      try {
         BotReply(ctx, replies.tzInvalidInput, kbs.CancelButton(ctx.from.language_code));
      } catch (e) {
         console.error(e);
      }
   }
}

module.exports = {
   LoadSchedulesList,
   DeleteSchedules,
   StartTimeZoneDetermination,
   ConfrimTimeZone
}