const { Composer } = require('telegraf');
const Markup = require('telegraf/markup');
const Extra = require('telegraf/extra');
const { Languages, LoadReplies } = require('../static/replies/repliesLoader');
const rp = require('../static/replies/repliesLoader');
const Format = require('../../processing/formatting');
const kbs = require('../static/replies/keyboards');
const { dbManagement, Schedule, User, Chat } = require('../../../storage/dataBase/db');
const { arrayParseString } = require('@alordash/parse-word-to-number');
const { wordsParseDate, TimeList, ParsedDate } = require('@alordash/date-parser');
const { Decrypt } = require('../../../storage/encryption/encrypt');
const { ProcessParsedDate } = require('../../processing/timeProcessing');
const { TrelloManager } = require('@alordash/node-js-trello');
const { help, trelloAddListCommand, trelloClear, trelloHelp } = require('../static/commandsList');
const { ExtractNicknames, GetUsersIDsFromNicknames } = require('../../processing/nicknamesExtraction');
const { BotReply, BotSendMessage, BotSendAttachment, BotReplyMultipleMessages } = require('./replying');
const utils = require('./utilities');

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
   let curTZ = await db.GetUserTZ(ctx.from.id);
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
 * @param {Composer} bot 
 * @param {dbManagement} db 
 */
async function CheckExpiredSchedules(bot, db) {
   console.log('Checking expired schedules ' + new Date());
   db.sending = true;
   let now = Date.now();
   let expiredSchedules = await db.CheckActiveSchedules(now);
   if (expiredSchedules.length > 0) {
      let ChatIDs = [];
      let deletingIDs = [];
      for (let schedule of expiredSchedules) {
         let chatID = schedule.chatid;
         if (chatID[0] == '_') {
            chatID = '-' + chatID.substring(1, chatID.length);
         }
         let expired = true;
         if (schedule.trello_card_id != null) {
            try {
               let chat = await db.GetChatById(chatID);
               if (typeof (chat) != 'undefined' && chat.trello_token != null) {
                  let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, chat.trello_token);
                  let card = await trelloManager.GetCard(schedule.trello_card_id);
                  if (typeof (card) != 'undefined' && typeof (card.due) != 'undefined') {
                     let dueTime = new Date(card.due).getTime();
                     if (now < dueTime) {
                        expired = false;
                        db.SetScheduleTargetDate(schedule.chatid, schedule.id, dueTime);
                     }
                  } else if (typeof (card) == 'undefined') {
                     let board = await trelloManager.GetBoard(chat.trello_board_id);
                     if (typeof (board) == 'undefined') {
                        db.ClearChatFromTrello(chat.id);
                     }
                  }
               }

               if (expired) {
                  expired = now >= schedule.target_date;
               }
            } catch (e) {
               console.log(e);
            }
         }
         if (!expired) {
            continue;
         }
         console.log(`Expired schedule = ${JSON.stringify(schedule)}`);
         if (!ChatIDs.includes(schedule.chatid)) {
            ChatIDs.push(schedule.chatid);
         }
         let mentionUser = '';
         if (schedule.username != 'none') {
            mentionUser = ' @' + schedule.username;
         }
         let language = await db.GetUserLanguage(+chatID);
         const replies = LoadReplies(language);
         let isBlocked = false;
         try {
            let keyboard = Extra.markup((m) =>
               m.inlineKeyboard([
                  m.callbackButton(replies.repeatSchedule, `repeat`)
               ]).oneTime()
            );
            let msg;
            let remindIcon = '⏰';
            let scheduleId = '';
            if (schedule.period_time > 0) {
               remindIcon = '🔄';
               scheduleId = ` /${schedule.id}`
            }

            const remindText = `${remindIcon}${scheduleId}${mentionUser} "${Decrypt(schedule.text, schedule.chatid)}"`;
            try {
               if (schedule.file_id != '~' && schedule.file_id != null) {
                  msg = await BotSendAttachment(bot, +chatID, remindText, schedule.file_id, keyboard, true);
               } else {
                  msg = await BotSendMessage(bot, +chatID, remindText, {
                     ...keyboard
                  }, true);
               }
               setTimeout(function (msg) {
                  bot.telegram.editMessageReplyMarkup(msg.chat.id, msg.message_id, Extra.markup((m) =>
                     m.inlineKeyboard([]).removeKeyboard()
                  ));
               }, repeatScheduleTime, msg);
            } catch (e) {
               console.error(e);
               isBlocked = true;
            }
         } catch (e) {
            console.error(e);
         }
         let shouldDelete = true;
         if (!isBlocked) {
            const nowSeconds = Date.now();
            schedule.target_date = +schedule.target_date;
            schedule.period_time = +schedule.period_time;
            schedule.max_date = +schedule.max_date;
            if (schedule.period_time >= 60 && schedule.max_date >= 60) {
               if (nowSeconds < schedule.max_date) {
                  shouldDelete = false;
                  await db.SetScheduleTargetDate(schedule.chatid, schedule.id, nowSeconds + schedule.period_time);
               }
            } else if (schedule.period_time >= 60 && schedule.max_date < 60) {
               shouldDelete = false;
               await db.SetScheduleTargetDate(schedule.chatid, schedule.id, nowSeconds + schedule.period_time);
            } else if (schedule.period_time < 60 && schedule.max_date >= 60) {
               if (nowSeconds < schedule.max_date) {
                  shouldDelete = false;
                  await db.SetScheduleTargetDate(schedule.chatid, schedule.id, schedule.max_date);
               }
            }
         }
         if (shouldDelete) {
            let index = utils.GetDeletingIDsIndex(schedule.chatid, deletingIDs);
            if (index === false) {
               deletingIDs.push({ s: `id = ${schedule.id} OR `, chatID: schedule.chatid });
            } else {
               deletingIDs[index].s += `id = ${schedule.id} OR `;
            }
         }
      }
      console.log('CHECKED, removing and reordering');
      for (let chatID of ChatIDs) {
         let index = utils.GetDeletingIDsIndex(chatID, deletingIDs);
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
         await db.AddUser(new User(userId, ts, db.defaultUserLanguage));
      } else {
         await db.SetUserTz(userId, ts);
      }
      tzPendingConfirmationUsers.splice(tzPendingConfirmationUsers.indexOf(ctx.from.id), 1);
      try {
         const schedulesCount = (await db.GetSchedules(utils.FormatChatId(ctx.chat.id))).length;
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

/**
 * @param {*} ctx 
 * @param {dbManagement} db 
 * @param {Array.<Number>} tzPendingConfirmationUsers
 * @param {Array.<Array.<Schedule>>} pendingSchedules 
 * @param {Array.<Schedule>} invalidSchedules 
 */
async function HandleCallbackQuery(ctx, db, tzPendingConfirmationUsers, pendingSchedules, invalidSchedules) {
   let data = ctx.callbackQuery.data;
   console.log(`got callback_query, data: "${data}"`);
   let chatID = utils.FormatChatId(ctx.callbackQuery.message.chat.id);
   const user = await db.GetUserById(ctx.from.id);
   const language = user.lang;
   const replies = LoadReplies(language);
   switch (data) {
      case 'repeat':
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
         let schedulesCount = await db.GetSchedules(chatID).length;
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
         break;
      case 'cancel_rm':
         invalidSchedules[chatID] = undefined;
         try {
            ctx.deleteMessage();
         } catch (e) {
            console.error(e);
         }
      case 'confirm':
         /**@type {Array.<Schedule>} */
         let schedules = pendingSchedules[chatID];
         try {
            let schedulesCount = (await db.GetSchedules(chatID)).length;
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
         break;
      case 'delete':
         try {
            let chat = await db.GetChatById(chatID);
            if (typeof (chat) != 'undefined' && chat.trello_list_id != null) {
               let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, chat.trello_token);
               for (const schedule of pendingSchedules[chatID]) {
                  trelloManager.DeleteCard(schedule.trello_card_id);
               }
            }
         } catch (e) {
            console.log(e);
         }
         pendingSchedules[chatID] = [];
         ctx.deleteMessage();
         break;
      case 'unsubscribe':
         await db.SetUserSubscription(ctx.from.id, false);
         break;
      case 'startTZ':
         try {
            ctx.from.language_code = language;
            ctx.editMessageReplyMarkup(Extra.markup((m) =>
               m.inlineKeyboard([]).removeKeyboard()
            ));
            StartTimeZoneDetermination(ctx, db, tzPendingConfirmationUsers);
         } catch (e) {
            console.error(e);
         }
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

/*
async function HandleCommandMessage(bot, ctx, db, chatID, msgText) {
   if (msgText.startsWith(`/${help}`)) {
      HelpCommand(ctx, db);
      return;
   }
   let regExp = new RegExp(`^${trelloAddListCommand}[0-9]+`);
   let match = msgText.match(regExp);
   if (match != null) {
      //#region ADD TRELLO LIST
      TrelloAddList(ctx, db);
      return;
      //#endregion
   }
   //#region DELETE CLICKED TASK 
   let scheduleId = parseInt(msgText.substring(1, msgText.length));
   if (isNaN(scheduleId)) {
      return;
   }
   let schedule = await db.GetScheduleById(chatID, scheduleId);
   try {
      const text = Format.Deleted(scheduleId.toString(10), false, ctx.from.language_code);
      if (typeof (schedule) != 'undefined') {
         await db.RemoveScheduleById(chatID, scheduleId);
         await db.ReorderSchedules(chatID);
         if (schedule.file_id != '~' && schedule.file_id != null) {
            BotSendAttachment(bot, +chatID, text, schedule.file_id);
            return;
         }
      }
      BotReply(ctx, text);
   } catch (e) {
      console.error(e);
   }
   //#endregion
}
*/
/**
 * @param {*} ctx 
 * @param {dbManagement} db 
 * @param {String} chatID 
 * @param {Boolean} inGroup 
 * @param {String} msgText 
 * @param {Languages} language 
 * @param {Boolean} mentioned 
 * @param {Array.<Array.<Schedule>>} pendingSchedules 
 * @param {Array.<Schedule>} invalidSchedules 
 * @param {Number} prevalenceForParsing 
 */
async function ParseScheduleMessage(ctx, db, chatID, inGroup, msgText, language, mentioned, pendingSchedules, invalidSchedules, prevalenceForParsing) {
   let reply = '';
   let file_id = utils.GetAttachmentId(ctx.message);
   await db.SetUserLanguage(ctx.from.id, language);
   const replies = LoadReplies(language);
   let tz = await db.GetUserTZ(ctx.from.id);
   //#region PARSE SCHEDULE
   let username = 'none';
   if (inGroup) {
      username = ctx.from.username;
   }
   let parsedDates = wordsParseDate(arrayParseString(msgText, 1), 1, prevalenceForParsing, msgText);
   let count = 1;
   let shouldWarn = false;
   let schedulesCount = (await db.GetSchedules(chatID)).length;
   if (parsedDates.length == 0) {
      parsedDates[0] = new ParsedDate(new TimeList(), new TimeList(), new TimeList(), msgText, 50, []);
   }
   let parsedDateIndex = 0;
   let chat = await db.GetChatById(`${ctx.chat.id}`);
   let trelloIsOk = typeof (chat) != 'undefined' && chat.trello_list_id != null;
   let keyboard;
   for (let parsedDate of parsedDates) {
      let dateParams = ProcessParsedDate(parsedDate, tz, inGroup && !mentioned);
      const dateIsValid = typeof (dateParams) != 'undefined';
      if (inGroup && !dateIsValid) {
         continue;
      }
      const dateExists = dateIsValid &&
         (dateParams.target_date != 0 ||
            dateParams.period_time != 0 ||
            dateParams.max_date != 0);
      let schedules = await db.GetSchedules(chatID);
      let found = false;
      let i = 0;
      for (; !found && i < schedules.length; i++) {
         if (schedules[i].text == parsedDate.string) {
            found = true;
         }
      }
      if (found) {
         let schedule = schedules[i - 1];
         if (!inGroup) {
            reply += Format.Scheduled(schedule.text, Format.FormDateStringFormat(new Date(+schedule.target_date + tz * 1000), language, true), language);
         }
      } else {
         if (count + schedulesCount < global.MaximumCountOfSchedules) {
            const textIsValid = parsedDate.string.length > 0;
            if (typeof (pendingSchedules[chatID]) == 'undefined') {
               pendingSchedules[chatID] = [];
            }
            let newSchedule = new Schedule(
               chatID,
               schedules.length + parsedDateIndex + 1,
               parsedDate.string,
               username,
               dateParams.target_date,
               dateParams.period_time,
               dateParams.max_date,
               file_id);
            let proceed = dateExists && textIsValid;
            if (!proceed && !inGroup) {
               let invalidSchedule = invalidSchedules[chatID];
               if (typeof (invalidSchedule) != 'undefined') {
                  const invalidText = invalidSchedule.text.length == 0;
                  if (invalidText && textIsValid) {
                     invalidSchedule.text = newSchedule.text;
                     newSchedule = invalidSchedule;
                     proceed = true;
                  } else if (!invalidText && dateExists) {
                     newSchedule.text = invalidSchedule.text;
                     proceed = true;
                  }
               }
               if (!proceed) {
                  invalidSchedules[chatID] = newSchedule;
                  if (!dateExists) {
                     reply = `${reply}${replies.scheduleDateInvalid}\r\n`;
                     keyboard = kbs.CancelButton(language);
                  } else if (!textIsValid) {
                     reply = `${reply}${replies.scheduleTextInvalid}\r\n`;
                     keyboard = kbs.CancelButton(language);
                  }
               }
            }
            if (proceed) {
               if (trelloIsOk) {
                  let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, chat.trello_token);

                  let nickExtractionResult = ExtractNicknames(newSchedule.text);
                  let ids = await GetUsersIDsFromNicknames(nickExtractionResult.nicks, trelloManager);
                  newSchedule.text = nickExtractionResult.string;

                  let text = newSchedule.text;
                  if (text.length > global.MaxTrelloCardTextLength) {
                     text = text.substring(0, global.MaxTrelloCardTextLength)
                     text = `${text.substring(0, text.lastIndexOf(' '))}...`;
                  }

                  let card = await trelloManager.AddCard(chat.trello_list_id, text, newSchedule.text, 0, new Date(newSchedule.target_date), ids);

                  if (typeof (card) != 'undefined') {
                     newSchedule.trello_card_id = card.id;
                  }
                  newSchedule.max_date = 0;
                  newSchedule.period_time = 0;
               }
               invalidSchedules[chatID] = undefined;
               pendingSchedules[chatID].push(newSchedule);
               count++;
               reply += await Format.FormStringFormatSchedule(newSchedule, tz, language, true, !inGroup, db) + `\r\n`;
            }
         } else {
            reply += replies.shouldRemove + '\r\n' + replies.maximumSchedulesCount + ` <b>${global.MaximumCountOfSchedules}</b>.`;
         }
      }
      if (!dateIsValid && !inGroup) {
         reply += replies.errorScheduling + '\r\n';
      }
      if (ctx.message.id >= global.MessagesUntilTzWarning
         && !inGroup && !(await db.HasUserID(ctx.from.id))) {
         shouldWarn = true;
      }
      parsedDateIndex++;
   }
   if ((!inGroup || mentioned) && typeof (pendingSchedules[chatID]) != 'undefined' && pendingSchedules[chatID].length > 0) {
      await db.AddSchedules(chatID, pendingSchedules[chatID]);
      pendingSchedules[chatID] = [];
   }
   //#endregion
   if (reply == '') {
      return;
   }
   if (shouldWarn) {
      reply += replies.tzWarning;
   }
   let answers = Format.SplitBigMessage(reply);
   let options = [];
   try {
      if (!mentioned && inGroup && typeof (schedule) === 'undefined' && parsedDates.length > 0) {
         if (typeof (pendingSchedules[chatID]) != 'undefined' && pendingSchedules[chatID].length > 0) {
            keyboard = kbs.ConfirmSchedulesKeyboard(language);
         }
         options[answers.length - 1] = keyboard;
         let results = await BotReplyMultipleMessages(ctx, answers, options);
         let msg = results[results.length - 1];
         setTimeout(function (ctx, msg) {
            if (typeof (msg) != 'undefined') {
               let chatID = utils.FormatChatId(msg.chat.id);
               ctx.telegram.deleteMessage(msg.chat.id, msg.message_id);
               pendingSchedules[chatID] = [];
            }
         }, repeatScheduleTime, ctx, msg);
      } else {

         options[answers.length - 1] = schedulesCount > 0 ? kbs.ListKeyboard(language) : Markup.removeKeyboard();
         if (typeof (keyboard) != 'undefined') {
            keyboard.reply_markup.inline_keyboard[0][0].callback_data = 'cancel_rm';
            options[answers.length - 1] = keyboard;
         }
         BotReplyMultipleMessages(ctx, answers, options);
      }
   } catch (e) {
      console.error(e);
   }
}

/*
async function HandleTextMessage(bot, ctx, db, tzPendingConfirmationUsers, trelloPendingConfirmationUsers, pendingSchedules, invalidSchedules, prevalenceForParsing = 50) {
   let chatID = utils.FormatChatId(ctx.chat.id);
   let inGroup = chatID[0] === '_';
   let msgText = ctx.message.text;
   if (typeof (msgText) == 'undefined') {
      msgText = ctx.message.caption;
   }
   if (typeof (msgText) == 'undefined' || (inGroup && typeof (ctx.message.forward_date) != 'undefined')) {
      invalidSchedules[chatID] = undefined;
      return;
   }
   let language = await db.GetUserLanguage(ctx.from.id);
   ctx.from.language_code = language;

   const mentionText = `@${ctx.me}`;
   const mentionIndex = msgText.indexOf(mentionText);
   const mentioned = mentionIndex != -1;
   if (mentioned) {
      msgText = msgText.substring(0, mentionIndex) + msgText.substring(mentionIndex + mentionText.length);
      if (msgText[mentionIndex - 1] == ' ' && msgText[mentionIndex] == ' ') {
         msgText = msgText.substring(0, mentionIndex) + msgText.substring(mentionIndex + 1);
      }
   }
   if (tzPendingConfirmationUsers.indexOf(ctx.from.id) >= 0) {
      invalidSchedules[chatID] = undefined;
      ConfrimTimeZone(ctx, db, tzPendingConfirmationUsers);
      return;
   }
   if (trelloPendingConfirmationUsers.indexOf(ctx.from.id) >= 0) {
      invalidSchedules[chatID] = undefined;
      TrelloAuthenticate(ctx, db, trelloPendingConfirmationUsers);
      return;
   }

   if (msgText[0] == '/') {
      invalidSchedules[chatID] = undefined;
      HandleCommandMessage(bot, ctx, db, chatID, msgText);
      return;
   }

   let determinedLanguage = utils.DetermineLanguage(msgText);
   if (determinedLanguage != null) {
      language = determinedLanguage;
   }
   ctx.from.language_code = language;
   ParseScheduleMessage(ctx, db, chatID, inGroup, msgText, language, mentioned, pendingSchedules, invalidSchedules, prevalenceForParsing);
}
*/

/*
async function HelpCommand(ctx, db) {
   let language = await db.GetUserLanguage(ctx.from.id);
   const replies = LoadReplies(language);
   const schedulesCount = (await db.GetSchedules(utils.FormatChatId(ctx.chat.id))).length;
   let keyboard = schedulesCount > 0 ? kbs.ListKeyboard(language) : Markup.removeKeyboard();
   keyboard['disable_web_page_preview'] = true;
   let reply;
   if (ctx.message.text.indexOf(trelloHelp) >= 0) {
      reply = `${replies.trelloHelp}\r\n${Format.TrelloInfoLink(language, process.env.SMART_SCHEDULER_INVITE)}`;
   } else {
      reply = replies.commands;
   }
   BotReply(ctx, reply, keyboard);
}
*/

/**
 * @param {*} ctx 
 * @param {User} user 
 * @param {dbManagement} db 
 * @param {Array.<Number>} trelloPendingConfirmationUsers 
 */
async function TrelloCommand(user, ctx, db, trelloPendingConfirmationUsers) {
   const replies = LoadReplies(user.lang);
   if (ctx.message.text.indexOf(trelloClear) >= 0 && ctx.chat.id >= 0) {
      db.ClearUserTrelloToken(ctx.from.id);
      BotReply(ctx, replies.trelloRemovedToken);
   } else if (user.trello_token == null && ctx.chat.id >= 0) {
      trelloPendingConfirmationUsers.push(ctx.from.id);
      BotReply(ctx, Format.TrelloAuthorizationMessage(process.env.TRELLO_TOKEN, process.env.SMART_SCHEDULER_BOT_NAME, user.lang),
         kbs.CancelKeyboard(user.lang));
   } else {
      let reply = '';

      let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, user.trello_token);
      let owner = await trelloManager.GetTokenOwner(user.trello_token);
      let noBoardBinded = false;
      let boardsList = [];
      if (typeof (owner) != 'undefined') {
         boardsList = await trelloManager.GetUserBoards(owner.id);
         let chat = await db.GetChatById(ctx.chat.id);
         if (typeof (chat) != 'undefined'
            && chat.trello_board_id != null
            && chat.trello_list_id != null
            && chat.trello_token != null) {
            let boardTrelloManager = new TrelloManager(process.env.TRELLO_TOKEN, chat.trello_token);
            let board = await boardTrelloManager.GetBoard(chat.trello_board_id);
            if (typeof (board) == 'undefined') {
               noBoardBinded = true;
            } else {
               let list = board.lists.find(x => x.id == chat.trello_list_id);

               if (list != null) {
                  reply = `${Format.FormAlreadyBoardBinded(board, list, user.lang)}\r\n`;
               } else {
                  noBoardBinded = true;
               }
            }
         } else {
            noBoardBinded = true;
         }
      } else {
         noBoardBinded = true;
      }
      if (noBoardBinded) {
         reply = `${replies.trelloNoBoardBinded}\r\n`;
      }

      if (ctx.chat.id >= 0) {
         reply = `${reply}${Format.FormBoardsList(boardsList, user.lang)}`;
      }
      let answers = Format.SplitBigMessage(reply);
      BotReplyMultipleMessages(ctx, answers);
   }
}

/**
 * @param {*} ctx 
 * @param {dbManagement} db 
 * @param {Array.<Number>} trelloPendingConfirmationUsers 
 */
async function TrelloAuthenticate(ctx, db, trelloPendingConfirmationUsers) {
   let token = ctx.message.text;
   const replies = rp.LoadReplies(ctx.from.language_code);
   let match = token.match(/^([a-zA-Z0-9]){64}$/);
   if (match != null) {
      db.SetUserTrelloToken(ctx.from.id, token);
      trelloPendingConfirmationUsers.splice(trelloPendingConfirmationUsers.indexOf(ctx.from.id), 1);

      let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, token);
      let owner = await trelloManager.GetTokenOwner(token);
      let boardsList = await trelloManager.GetUserBoards(owner.id);

      let reply = `${replies.trelloSavedToken}\r\n${Format.FormBoardsList(boardsList, ctx.from.language_code)}`;

      let chatID = `${ctx.chat.id}`;
      if (chatID[0] == '-') {
         chatID = `_${chatID.substring(1)}`;
      }
      const schedulesCount = (await db.GetSchedules(utils.FormatChatId(ctx.chat.id))).length;
      let answers = Format.SplitBigMessage(reply);
      let options = [];
      options[answers.length - 1] = schedulesCount > 0 ? kbs.ListKeyboard(ctx.from.language_code) : Markup.removeKeyboard();
      BotReplyMultipleMessages(ctx, answers, options);
   } else {
      BotReply(ctx, replies.trelloWrongToken, kbs.CancelButton(ctx.from.language_code));
   }
}

/**
 * @param {*} ctx 
 * @param {dbManagement} db 
 * @param {User} user
 */
async function TrelloPinCommand(ctx, db, user) {
   const replies = rp.LoadReplies(user.lang);
   let text = ctx.message.text;
   let id = text.match(/[a-zA-Z0-9]{24}/)[0];

   let chat = await db.GetChatById(`${ctx.chat.id}`);
   let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, user.trello_token);
   let board = await trelloManager.GetBoard(id);

   if (typeof (board) != 'undefined') {
      let chatId = `${ctx.chat.id}`;
      if (typeof (chat) == 'undefined') {
         await db.AddChat(chatId, id);
      } else {
         await db.SetChatTrelloBoard(chatId, id);
      }
      let replies = Format.SplitBigMessage(Format.FormBoardListsList(board, user.lang));
      await BotReplyMultipleMessages(ctx, replies);
   } else {
      BotReply(ctx, replies.trelloBoardDoesNotExist);
   }
}

/**
 * @param {*} ctx 
 * @param {dbManagement} db 
 */
async function TrelloAddList(ctx, db) {
   let text = ctx.message.text;
   let i = parseInt(text.substring(trelloAddListCommand.length)) - 1;

   let chatId = `${ctx.chat.id}`;
   let user = await db.GetUserById(ctx.from.id);
   const replies = rp.LoadReplies(user.lang);
   let chat = await db.GetChatById(chatId);
   if (chat.trello_board_id == null) {
      BotReply(ctx, replies.trelloNoBoardBinded);
      return;
   }
   let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, user.trello_token);
   let board = await trelloManager.GetBoard(chat.trello_board_id);
   let target_list = board.lists[i];
   await db.SetChatTrelloList(chatId, target_list.id, user.trello_token);
   BotReply(ctx, Format.FormListBinded(board, target_list, user.lang));
}

/**
 * @param {*} ctx 
 * @param {dbManagement} db 
 * @param {User} user 
 */
async function TrelloUnpinCommand(ctx, db, user) {
   let chat = await db.GetChatById(ctx.chat.id);
   db.ClearChatFromTrello(ctx.chat.id);
   if (chat.trello_token != null) {
      let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, chat.trello_token);
      let board = await trelloManager.GetBoard(chat.trello_board_id);
      BotReply(ctx, Format.FormBoardUnbinded(board, user.lang));
   }
}

module.exports = {
   LoadSchedulesList,
   DeleteSchedules,
   StartTimeZoneDetermination,
   CheckExpiredSchedules,
   HandleCallbackQuery,
   HandleTextMessage,
   HelpCommand,
   TrelloCommand,
   TrelloPinCommand,
   TrelloUnpinCommand
}