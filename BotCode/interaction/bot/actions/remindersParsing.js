const Markup = require('telegraf/markup');
const { Languages, LoadReplies } = require('../static/replies/repliesLoader');
const Format = require('../../processing/formatting');
const kbs = require('../static/replies/keyboards');
const { dbManagement, Schedule, User, Chat } = require('../../../storage/dataBase/db');
const { arrayParseString } = require('@alordash/parse-word-to-number');
const { wordsParseDate, TimeList, ParsedDate } = require('@alordash/date-parser');
const { ProcessParsedDate } = require('../../processing/timeProcessing');
const { TrelloManager } = require('@alordash/node-js-trello');
const { ExtractNicknames, GetUsersIDsFromNicknames } = require('../../processing/nicknamesExtraction');
const { BotReplyMultipleMessages } = require('./replying');
const utils = require('./utilities');

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

module.exports = ParseScheduleMessage;