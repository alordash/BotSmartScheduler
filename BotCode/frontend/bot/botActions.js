const { Composer } = require('telegraf');
const Markup = require('telegraf/markup');
const Extra = require('telegraf/extra');
const rp = require('../replies/replies');
const { dbManagement, Schedule, User } = require('../../backend/dataBase/db');
const { parseString } = require('@alordash/parse-word-to-number');
const { parseDate, ParsedDate, TimeList } = require('@alordash/date-parser');

let pendingSchedules = [];

//#region functions
/**
 * @param {Number} number 
 * @returns {Number}
 */
function Div1000(number) {
   return Math.floor(number / 1000);
}

/**
 * @param {TimeList} timeList 
 * @returns {Boolean} 
 */
function TimeListIsEmpty(timeList) {
   return typeof (timeList.years) == 'undefined'
      && typeof (timeList.months) == 'undefined'
      && typeof (timeList.dates) == 'undefined'
      && typeof (timeList.hours) == 'undefined'
      && typeof (timeList.minutes) == 'undefined';
}

/**
 * @param {TimeList} timeList 
 * @param {Number} timeListDate 
 * @returns {TimeList} 
 */
function UpdateTime(timeList, timeListDate) {
   const now = new Date();
   const tsNow = Div1000(now.getTime());
   if (timeListDate < tsNow) {
      let dif = tsNow - timeListDate;
      let difInDate = new Date(dif * 1000);
      difInDate.setTime(difInDate.getTime() + difInDate.getTimezoneOffset() * 60 * 1000);
      if (difInDate.getFullYear() > 1970) {
         if (typeof (timeList.years) == 'undefined') {
            timeList.years = now.getFullYear() + difInDate.getFullYear() + 1;
            return timeList;
         } else {
            return undefined;
         }
      } else if (difInDate.getMonth() > 0) {
         if (typeof (timeList.months) == 'undefined') {
            timeList.months = now.getMonth() + difInDate.getMonth() + 1;
            return timeList;
         } else {
            if (typeof (timeList.years) == 'undefined') {
               timeList.years = now.getFullYear() + 1;
            }
            return undefined;
         }
      } else if (difInDate.getDate() > 1) {
         if (typeof (timeList.dates) == 'undefined') {
            timeList.dates = now.getDate() + difInDate.getDate() + 1;
            return timeList;
         } else {
            if (typeof (timeList.months) == 'undefined') {
               timeList.months = now.getMonth() + 1;
            } else if (typeof (timeList.years) == 'undefined') {
               timeList.years = now.getFullYear() + 1;
            } else {
               return undefined;
            }
         }
      } else if (difInDate.getHours() > 0) {
         if (typeof (timeList.hours) == 'undefined') {
            timeList.hours = now.getHours() + difInDate.getHours() + 1;
            return timeList;
         } else {
            if (typeof (timeList.dates) == 'undefined') {
               timeList.dates = now.getDate() + 1;
            } else if (typeof (timeList.months) == 'undefined') {
               timeList.months = now.getMonth() + 1;
            } else if (typeof (timeList.years) == 'undefined') {
               timeList.years = now.getFullYear() + 1;
            } else {
               return undefined;
            }
         }
      } else if (difInDate.getMinutes() > 0) {
         if (typeof (timeList.minutes) == 'undefined') {
            timeList.minutes = now.getMinutes() + difInDate.getMinutes() + 1;
            return timeList;
         } else {
            if (typeof (timeList.hours) == 'undefined') {
               timeList.hours = now.getHours() + 1;
            } else if (typeof (timeList.dates) == 'undefined') {
               timeList.dates = now.getDate() + 1;
            } else if (typeof (timeList.months) == 'undefined') {
               timeList.months = now.getMonth() + 1;
            } else if (typeof (timeList.years) == 'undefined') {
               timeList.years = now.getFullYear() + 1;
            } else {
               return undefined;
            }
         }
      }
   }
   return timeList;
}

/**
 * @param {ParsedDate} parsedDate 
 * @param {Number} tz 
 * @returns {{target_date: Number, period_time: Number, max_date: Number}}
 */
function ProcessParsedDate(parsedDate, tz) {
   let dateValues = parsedDate.valueOf();
   let target_date = Div1000(dateValues.target_date.getTime());
   let period_time = Div1000(dateValues.period_time.getTime());
   let max_date = Div1000(dateValues.max_date.getTime());
   if (!parsedDate.target_date.isOffset) {
      target_date -= tz;
   }
   if (!parsedDate.max_date.isOffset) {
      max_date -= tz;
   }
   parsedDate.target_date = UpdateTime(parsedDate.target_date, target_date);
   if (!TimeListIsEmpty(parsedDate.max_date)) {
      parsedDate.max_date = UpdateTime(parsedDate.max_date, max_date);
   } else {
      let zeroDate = new Date(0);
      parsedDate.max_date.years = zeroDate.getFullYear();
      parsedDate.max_date.months = zeroDate.getMonth();
      parsedDate.max_date.dates = zeroDate.getDate();
      parsedDate.max_date.hours = zeroDate.getHours();
      parsedDate.max_date.minutes = zeroDate.getMinutes();
   }
   if (typeof (parsedDate.target_date) == 'undefined') {
      return undefined;
   }
   dateValues = parsedDate.valueOf();
   dateValues.target_date.setSeconds(0, 0);
   dateValues.period_time.setSeconds(0, 0);
   dateValues.max_date.setSeconds(0, 0);
   target_date = dateValues.target_date.getTime();
   period_time = dateValues.period_time.getTime();
   max_date = dateValues.max_date.getTime();
   return {
      target_date,
      period_time,
      max_date
   }
}

/**@param {Date} date
 * @returns {String}
 */
function FormDateStringFormat(date) {
   let month = date.getMonth();
   let hour = date.getHours().toString(10),
      minute = date.getMinutes().toString(10);
   if (hour.length <= 1) {
      hour = '0' + hour;
   }
   if (minute.length <= 1) {
      minute = '0' + minute;
   }
   let year = '';
   if (date.getFullYear() != new Date().getFullYear()) {
      year = ` ${date.getFullYear()} г.`;
   }
   return `${date.getDate()} ${/*constants.monthsRusRoot[month]*/0}${/*constants.monthsRusEnding[month][1]*/0} ${hour}:${minute}${year}`;
}

function GetDeletingIDsIndex(chatID, deletingIDs) {
   if (deletingIDs.length) {
      for (let i in deletingIDs) {
         if (deletingIDs[i].chatID == chatID) {
            return i;
         }
      }
   }
   return false;
}
/**
 * @param {Number} id 
 * @returns {String} 
 */
function FormatChatId(id) {
   id = id.toString(10);
   if (id[0] == '-') {
      id = '_' + id.substring(1);
   }
   return id;
}

/**
 * @param {String} chatID 
 * @param {Number} tsOffset 
 * @param {dbManagement} db 
 */
async function LoadSchedulesList(chatID, tsOffset, db) {
   let schedules = await db.ListSchedules(chatID);
   if (schedules.length > 0) {
      let answer = ``;
      schedules.sort((a, b) => a.id - b.id);
      for (let schedule of schedules) {
         let scheduledBy = '';
         if (schedule.username != 'none') {
            scheduledBy = ` by <b>${schedule.username}</b>`;
         }
         answer += `/${schedule.id}. "${schedule.text}"${scheduledBy}: <b>${FormDateStringFormat(new Date(+schedule.target_date + tsOffset * 1000))}</b>\r\n`;
      }
      return answer;
   } else {
      return rp.listIsEmpty;
   }
}

/**
 * @param {*} ctx 
 * @param {dbManagement} db 
 */
async function DeleteSchedules(ctx, db) {
   let chatID = FormatChatId(ctx.chat.id)
   let msgText = ctx.message.text;
   if (msgText.indexOf('all') == "/del ".length) {
      await db.ClearAllSchedules(chatID);
      await ctx.replyWithHTML(rp.cleared);
   } else {
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
            ctx.replyWithHTML(rp.deleted(nums.join(', '), end, false));
         } catch (e) {
            console.error(e);
         }
      } else {
         try {
            ctx.replyWithHTML(rp.notDeleted);
         } catch (e) {
            console.error(e);
         }
      }
   }
}

/**
 * @param {*} ctx 
 * @param {dbManagement} db 
 * @param {Array.<Number>} tzPendingConfirmationUsers 
 */
async function StartTimeZoneDetermination(ctx, db, tzPendingConfirmationUsers) {
   let curTZ = await db.GetUserTZ(ctx.from.id);
   let reply = '';
   if (curTZ !== 0) {
      reply = rp.tzCurrent(curTZ) + '\r\n';
   }
   let isPrivateChat = ctx.chat.id >= 0;
   if (isPrivateChat) {
      reply += rp.tzPrivateChat;
      try {
         return ctx.replyWithHTML(reply, Markup
            .keyboard([
               [{ text: rp.tzUseLocation, request_location: true }, { text: rp.tzTypeManually }],
               [{ text: rp.tzCancel }]
            ]).oneTime()
            .removeKeyboard()
            .resize()
            .extra()
         );
      } catch (e) {
         console.error(e);
      }
   }
   reply += rp.tzGroupChat;
   if (tzPendingConfirmationUsers.indexOf(ctx.from.id) < 0) {
      tzPendingConfirmationUsers.push(ctx.from.id);
   }
   try {
      return await ctx.replyWithHTML(rp.tzGroupChat);
   } catch (e) {
      console.error(e);
   }
}

/**
 * @param {Composer} bot 
 * @param {dbManagement} db 
 */
async function CheckExpiredSchedules(bot, db) {
   console.log('Checking expired schedules ' + new Date());
   db.sending = true;
   let expiredSchedules = await db.CheckActiveSchedules(Date.now());
   if (expiredSchedules.length > 0) {
      console.log(`expiredSchedules = ${JSON.stringify(expiredSchedules)}`);
      let ChatIDs = [];
      let deletingIDs = [];
      for (let schedule of expiredSchedules) {
         let chatID = schedule.chatid;
         if (chatID[0] == '_') {
            chatID = '-' + chatID.substring(1, chatID.length);
         }
         console.log(`Expired schedule = ${JSON.stringify(schedule)}`);
         if (!ChatIDs.includes(schedule.chatid)) {
            ChatIDs.push(schedule.chatid);
         }
         let mentionUser = '';
         if (schedule.username != 'none') {
            mentionUser = ' @' + schedule.username;
         }
         try {
            let msg = await bot.telegram.sendMessage(+chatID, `⏰${mentionUser} "${schedule.text}"`, Extra.markup((m) =>
               m.inlineKeyboard([
                  m.callbackButton(rp.repeatSchedule, `repeat|0|-|${schedule.text}`)
               ]).oneTime()
            ));
            setTimeout(function (msg) {
               bot.telegram.editMessageReplyMarkup(msg.chat.id, msg.message_id, Extra.markup((m) =>
                  m.inlineKeyboard([]).removeKeyboard()
               ));
            }, repeatScheduleTime, msg);
         } catch (e) {
            console.error(e);
         }

         let index = GetDeletingIDsIndex(schedule.chatid, deletingIDs);
         if (index === false) {
            deletingIDs.push({ s: `id = ${schedule.id} OR `, chatID: schedule.chatid });
         } else {
            deletingIDs[index].s += `id = ${schedule.id} OR `;
         }
      }
      console.log('CHECKED, removing and reordering');
      for (let chatID of ChatIDs) {
         let index = GetDeletingIDsIndex(chatID, deletingIDs);
         if (index !== false) {
            let s = deletingIDs[index].s;
            s = s.substring(0, s.length - 4);
            await db.RemoveSchedules(chatID, s);
         }
         await db.ReorderSchedules(chatID);
      }
      console.log('Removed and reordered.');
   }
   db.sending = false;
   console.log(`Done checking expired schedules`);
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
         await db.AddUser(new User(userId, ts, db.defaultUserLanguage));
      } else {
         await db.AddUserTZ(userId, ts);
      }
      tzPendingConfirmationUsers.splice(tzPendingConfirmationUsers.indexOf(ctx.from.id), 1);
      try {
         ctx.replyWithHTML(rp.tzCurrent(ts), rp.mainKeyboard);
      } catch (e) {
         console.error(e);
      }
   } else {
      console.log(`Can't determine tz in "${ctx.message.text}"`);
      try {
         return ctx.replyWithHTML(rp.tzInvalidInput, Extra.markup((m) =>
            m.inlineKeyboard([
               m.callbackButton(rp.tzCancel, 'tz cancel')
            ]).oneTime()
         ));
      } catch (e) {
         console.error(e);
      }
   }
}

/**
 * @param {*} ctx 
 * @param {dbManagement} db 
 */
async function HandleCallbackQuery(ctx, db) {
   console.log("got callback_query");
   const data = ctx.callbackQuery.data;
   let chatID = FormatChatId(ctx.callbackQuery.message.chat.id);
   switch (data) {
      case 'repeat':
         let text = ctx.callbackQuery.message.text;
         let schedule = await db.GetScheduleByText(chatID, text);
         let username = 'none';
         if (chatID[0] == '_') {
            username = ctx.from.username;
         }
         let tz = await db.GetUserTZ(ctx.from.id);
         let target_date = Div1000(Date.now() + global.repeatScheduleTime);
         schedule.target_date = target_date;

         try {
            await db.AddNewSchedule(schedule);
            ctx.editMessageText(text + '\r\n' + rp.remindSchedule + '<b>' + FormDateStringFormat(new Date((target_date + tz) * 1000)) + '</b>', { parse_mode: 'HTML' });
         } catch (e) {
            console.error(e);
         }
         break;
      case 'confirm':
         try {
            if (typeof (pendingSchedules[chatID]) != 'undefined' && pendingSchedules[chatID].length > 0) {
               await db.AddNewSchedules(chatID, pendingSchedules[chatID]);
            }
         } catch (e) {
            console.error(e);
         } finally {
            pendingSchedules[chatID] = [];
            ctx.editMessageReplyMarkup(Extra.markup((m) =>
               m.inlineKeyboard([]).removeKeyboard()
            ));
         }
         break;
      case 'delete':
         ctx.deleteMessage();
         break;

      default:
         break;
   }
   try {
      ctx.answerCbQuery();
   } catch (e) {
      console.error(e);
   }
}

/**
 * @param {*} ctx 
 * @param {dbManagement} db 
 * @param {Array.<Number>} tzPendingConfirmationUsers 
 */
async function HandleTextMessage(ctx, db, tzPendingConfirmationUsers) {
   let chatID = FormatChatId(ctx.chat.id)
   let inGroup = chatID[0] === '_';
   if (tzPendingConfirmationUsers.indexOf(ctx.from.id) >= 0) {
      ConfrimTimeZone(ctx, db, tzPendingConfirmationUsers);
   } else {
      let reply = '';
      let msgText = ctx.message.text;
      if (msgText[0] == '/') {
         //#region DELETE CLICKED TASK 
         let scheduleId = parseInt(msgText.substring(1, msgText.length));
         if (!isNaN(scheduleId)) {
            await db.RemoveScheduleById(chatID, scheduleId);
            await db.ReorderSchedules(chatID);
            try {
               ctx.replyWithHTML(rp.deleted(scheduleId.toString(10), '', false));
            } catch (e) {
               console.error(e);
            }
         }
         //#endregion
      } else {
         //#region PARSE SCHEDULE
         let tz = await db.GetUserTZ(ctx.from.id);
         let prevalence = 50;
         let username = 'none';
         if (inGroup) {
            username = ctx.from.username;
            prevalence = 70;
         }
         let parsedDates = parseDate(parseString(msgText, 1), 1, prevalence);
         let count = 1;
         let shouldWarn = false;
         //         let parsedMessage = await DateParser.ParseDate(msgText, tz, process.env.ENABLE_LOGS != 'false');
         if (parsedDates.length == 0) {
            if (!inGroup) {
               reply += rp.errorScheduling;
            }
         } else {
            let schedulesCount = (await db.GetSchedules(chatID)).length;
            console.log(`schedulesCount = ${schedulesCount}`);
            for (let parsedDate of parsedDates) {
               let schedule = await db.GetScheduleByText(chatID, parsedDate.string);
               if (typeof (schedule) != 'undefined') {
                  reply += rp.scheduled(schedule.text, FormDateStringFormat(new Date(schedule.target_date + tz * 1000)));
               } else {
                  if (count + schedulesCount < global.MaximumCountOfSchedules) {
                     let dateParams = ProcessParsedDate(parsedDate, tz);
                     if (typeof (dateParams) != 'undefined') {
                        if (typeof (pendingSchedules[chatID]) == 'undefined') {
                           pendingSchedules[chatID] = [];
                        }
                        pendingSchedules[chatID].push(new Schedule(
                           chatID,
                           0,
                           parsedDate.string,
                           username,
                           dateParams.target_date,
                           dateParams.period_time,
                           dateParams.max_date));
                        count++;
                        //reply += parsedMessage.answer + `\r\n`;
                     } else {
                        if (!inGroup) {
                           reply += rp.errorScheduling + `\r\n`;
                        }
                     }
                     if (!inGroup && !(await db.HasUserID(ctx.from.id))) {
                        shouldWarn = true;
                     }
                  } else {
                     reply += rp.exceededLimit(global.MaximumCountOfSchedules);
                  }
               }
            }
         }
         if (!inGroup && typeof (pendingSchedules[chatID]) != 'undefined' && pendingSchedules[chatID].length > 0) {
            await db.AddNewSchedules(chatID, pendingSchedules[chatID]);
            pendingSchedules[chatID] = [];
         }
         //#endregion
         reply = 'test';
         if (reply != '') {
            if (shouldWarn) {
               reply += rp.tzWarning;
            }
            try {
               if (inGroup && typeof (schedule) === 'undefined' && parsedDates.length > 0) {
                  let msg = await ctx.replyWithHTML(reply, Extra.markup((m) =>
                     m.inlineKeyboard([
                        m.callbackButton(rp.confirmSchedule, `confirm`),
                        m.callbackButton(rp.declineSchedule, `delete`)
                     ]).oneTime()
                  ));
                  setTimeout(function (ctx, msg) {
                     let chatID = FormatChatId(msg.chat.id);
                     ctx.deleteMessage(msg.chat.id, msg.message.id);
                     pendingSchedules[chatID] = [];
                  }, repeatScheduleTime, ctx, msg);
               } else {
                  ctx.replyWithHTML(reply);
               }
            } catch (e) {
               console.error(e);
            }
         }
      }
   }
}
//#endregion

module.exports = {
   GetDeletingIDsIndex,
   FormatChatId,
   LoadSchedulesList,
   DeleteSchedules,
   StartTimeZoneDetermination,
   CheckExpiredSchedules,
   HandleCallbackQuery,
   HandleTextMessage
}