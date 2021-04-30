const Markup = require('telegraf/markup');
const { Languages, LoadReplies } = require('../../static/replies/repliesLoader');
const Format = require('../../../processing/formatting');
const kbs = require('../../static/replies/keyboards');
const { DataBase, Schedule, User, Chat } = require('../../../../storage/dataBase/DataBase');
const { help, trelloAddListCommand, trelloHelp } = require('../../static/commandsList');
const { BotReply, BotSendAttachment } = require('../replying');
const utils = require('../utilities');
const ParseScheduleMessage = require('../remindersParsing');
const { ConfrimTimeZone } = require('../technical');
const { TrelloAuthenticate, TrelloAddList } = require('./trelloCommands');

/** @param {*} ctx */
async function HelpCommand(ctx) {
   let language = await DataBase.Users.GetUserLanguage(ctx.from.id);
   const replies = LoadReplies(language);
   const schedulesCount = await DataBase.Schedules.GetSchedulesCount(utils.FormatChatId(ctx.chat.id));
   let keyboard = schedulesCount > 0 ? kbs.ListKeyboard(language) : kbs.RemoveKeyboard();
   keyboard['disable_web_page_preview'] = true;
   let reply;
   if (ctx.message.text.indexOf(trelloHelp) >= 0) {
      reply = `${replies.trelloHelp}\r\n${Format.TrelloInfoLink(language, process.env.SMART_SCHEDULER_INVITE)}`;
   } else {
      reply = replies.commands;
   }
   BotReply(ctx, reply, keyboard);
}

/** 
 * @param {*} ctx 
 * @param {String} chatID 
 * @param {String} msgText 
 * @returns 
 */
async function HandleCommandMessage(bot, ctx, chatID, msgText) {
   if (msgText.startsWith(`/${help}`)) {
      HelpCommand(ctx);
      return;
   }
   let regExp = new RegExp(`^${trelloAddListCommand}[0-9]+`);
   let match = msgText.match(regExp);
   if (match != null) {
      //#region ADD TRELLO LIST
      TrelloAddList(ctx);
      return;
      //#endregion
   }
   //#region DELETE CLICKED TASK 
   let scheduleId = parseInt(msgText.substring(1, msgText.length));
   if (isNaN(scheduleId)) {
      return;
   }
   let schedule = await DataBase.Schedules.GetScheduleById(chatID, scheduleId);
   try {
      const text = Format.Deleted(scheduleId.toString(10), false, ctx.from.language_code);
      if (typeof (schedule) != 'undefined') {
         await DataBase.Schedules.RemoveScheduleById(chatID, scheduleId);
         await DataBase.Schedules.ReorderSchedules(chatID);
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

/**
 * @param {*} ctx 
 * @param {Array.<Number>} tzPendingConfirmationUsers 
 * @param {Array.<Number>} trelloPendingConfirmationUsers 
 * @param {Array.<Array.<Schedule>>} pendingSchedules 
 * @param {Array.<Schedule>} invalidSchedules 
 * @param {Number} prevalenceForParsing 
 */
async function HandleTextMessage(bot, ctx, tzPendingConfirmationUsers, trelloPendingConfirmationUsers, pendingSchedules, invalidSchedules, prevalenceForParsing = 50) {
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

   let user = await DataBase.Users.GetUserById(ctx.from.id, true);
   let language = user.lang;
   let determinedLanguage;
   if(user.id == null) {
      language = determinedLanguage = utils.DetermineLanguage(msgText);
      user = new User(ctx.from.id, undefined, language, undefined, undefined);
      await DataBase.Users.AddUser(user);
   }
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
      ConfrimTimeZone(ctx, tzPendingConfirmationUsers);
      return;
   }
   if (trelloPendingConfirmationUsers.indexOf(ctx.from.id) >= 0) {
      invalidSchedules[chatID] = undefined;
      TrelloAuthenticate(ctx, trelloPendingConfirmationUsers);
      return;
   }

   if (msgText[0] == '/') {
      invalidSchedules[chatID] = undefined;
      HandleCommandMessage(bot, ctx, chatID, msgText);
      return;
   }

   if (typeof(determinedLanguage) == 'undefined') {
      determinedLanguage = utils.DetermineLanguage(msgText);
      if (determinedLanguage != null) {
         language = determinedLanguage;
      }
   }
   ParseScheduleMessage(ctx, chatID, inGroup, msgText, language, mentioned, pendingSchedules, invalidSchedules, prevalenceForParsing);
}

module.exports = {
   HelpCommand,
   HandleTextMessage
}