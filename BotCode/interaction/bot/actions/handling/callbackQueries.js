const Extra = require('telegraf/extra');
const { Languages, LoadReplies } = require('../static/replies/repliesLoader');
const Format = require('../../processing/formatting');
const { dbManagement, Schedule, User, Chat } = require('../../../storage/dataBase/db');
const { TrelloManager } = require('@alordash/node-js-trello');
const utils = require('./utilities');
const { StartTimeZoneDetermination } = require('../technical');

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

module.exports = HandleCallbackQuery;