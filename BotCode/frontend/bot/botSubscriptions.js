const fs = require('fs');
const path = require('path');
const request = require('request-promise');
const { Languages, LoadReplies } = require('../replies/replies');
const rp = require('../replies/replies');
const botActions = require('./botActions');
const { FormatChatId } = require('./botActions');
const { Composer } = require('telegraf');
const { dbManagement, User } = require('../../backend/dataBase/db');
const { speechToText } = require('../../backend/stt/stt');
const Markup = require('telegraf/markup');
const stt = new speechToText(process.env.YC_API_KEY, process.env.YC_FOLDER_ID);
const cms = require('./botCommands');

let tzPendingConfirmationUsers = [];
let trelloPendingConfirmationUsers = [];

/**
 * @param {Composer} bot 
 * @param {dbManagement} db 
 */
function InitActions(bot, db) {
   bot.start(async ctx => {
      const replies = LoadReplies(Languages.general);
      try {
         let inlineKeyboard = rp.TzDeterminationOnStartInlineKeyboard(Languages.general);
         inlineKeyboard['disable_web_page_preview'] = true;
         ctx.replyWithHTML(replies.start, inlineKeyboard);
      } catch (e) {
         console.error(e);
      }
   });
   bot.help(async ctx => {
      try {
         botActions.HelpCommand(ctx, db);
      } catch (e) {
         console.error(e);
      }
   });

   bot.command(cms.listSchedules, async ctx => {
      let tz = await db.GetUserTZ(ctx.from.id);
      let language = await db.GetUserLanguage(ctx.from.id);
      let chatID = FormatChatId(ctx.chat.id);
      let answers = await botActions.LoadSchedulesList(chatID, tz, db, language);
      for (const answer of answers) {
         try {
            ctx.replyWithHTML(answer, { disable_web_page_preview: true });
         } catch (e) {
            console.error(e);
         }
      }
   });
   bot.command(cms.deleteSchedules, async ctx => {
      let language = await db.GetUserLanguage(ctx.from.id);
      ctx.from.language_code = language;
      botActions.DeleteSchedules(ctx, db);
   });
   bot.command(cms.changeTimeZone, async ctx => {
      try {
         let language = await db.GetUserLanguage(ctx.from.id);
         ctx.from.language_code = language;
         botActions.StartTimeZoneDetermination(ctx, db, tzPendingConfirmationUsers);
      } catch (e) {
         console.error(e);
      }
   });
   bot.command(cms.trelloInit, async ctx => {
      try {
         let user = await db.GetUserById(ctx.from.id);
         botActions.TrelloCommand(user, ctx, db, trelloPendingConfirmationUsers);
      } catch (e) {
         console.error(e);
      }
   });
   bot.command(cms.trelloBindBoardCommand, async ctx => {
      try {
         let user = await db.GetUserById(ctx.from.id);
         botActions.TrelloPinCommand(ctx, db, user);
      } catch (e) {
         console.error(e);
      }
   });
   bot.command(cms.trelloUnbindBoardCommand, async ctx => {
      try {
         let user = await db.GetUserById(ctx.from.id);
         botActions.TrelloUnpinCommand(ctx, db, user);
      } catch (e) {
         console.log(e);
      }
   });
   console.log('__dirname :>> ', __dirname);
   //let repliesFiles = fs.readdirSync(path.join(__dirname, '..', 'replies'));
   let repliesFiles = fs.readdirSync(__dirname.substring(0, __dirname.lastIndexOf('/')) + '/replies');
   console.log('repliesFiles :>> ', repliesFiles);
   for (filename of repliesFiles) {
      if (path.extname(filename) == '.json') {
         const language = path.basename(filename, '.json');
         const replies = LoadReplies(language);
         if (typeof (replies.tzUseLocation) != 'undefined') {
            bot.hears(replies.tzUseLocation, ctx => {
               try {
                  ctx.replyWithHTML(replies.tzUseLocationResponse);
               } catch (e) {
                  console.error(e);
               }
            });
         }
         if (typeof (replies.tzTypeManually) != 'undefined') {
            bot.hears(replies.tzTypeManually, ctx => {
               if (tzPendingConfirmationUsers.indexOf(ctx.from.id) < 0) {
                  tzPendingConfirmationUsers.push(ctx.from.id);
               }
               try {
                  ctx.replyWithHTML(replies.tzTypeManuallyReponse);
               } catch (e) {
                  console.error(e);
               }
            });
         }
         if (typeof (replies.cancel) != 'undefined') {
            bot.hears(replies.cancel, async ctx => {
               botActions.ClearPendingConfirmation(tzPendingConfirmationUsers, trelloPendingConfirmationUsers, ctx.from.id);
               let reply = replies.cancelReponse;
               let user = await db.GetUserById(ctx.from.id);
               if (typeof (user) == 'undefined' || user.tz == null) {
                  reply += '\r\n' + replies.tzCancelWarning;
               }
               try {
                  const schedulesCount = (await db.GetSchedules(FormatChatId(ctx.chat.id))).length;
                  ctx.replyWithHTML(reply,
                     schedulesCount > 0 ? rp.ListKeyboard(language) : Markup.removeKeyboard());
               } catch (e) {
                  console.error(e);
               }
            });
         }
         if (typeof (replies.showListAction) != 'undefined') {
            bot.hears(replies.showListAction, async ctx => {
               let chatID = FormatChatId(ctx.chat.id);
               let tz = await db.GetUserTZ(ctx.from.id);
               let answers = await botActions.LoadSchedulesList(chatID, tz, db, language);
               for (const answer of answers) {
                  try {
                     ctx.replyWithHTML(answer, { disable_web_page_preview: true });
                  } catch (e) {
                     console.error(e);
                  }
               }
            });
         }
         if (typeof (replies.changeTimeZoneAction) != 'undefined') {
            bot.hears(replies.changeTimeZoneAction, async ctx => {
               botActions.StartTimeZoneDetermination(ctx, db, tzPendingConfirmationUsers);
            });
         }
      }
   }

   bot.action('cancel', async ctx => {
      let language = await db.GetUserLanguage(ctx.from.id);
      const replies = LoadReplies(language);
      botActions.ClearPendingConfirmation(tzPendingConfirmationUsers, trelloPendingConfirmationUsers, ctx.from.id);
      let text = replies.cancelReponse;
      let user = await db.GetUserById(ctx.from.id);
      if (typeof (user) == 'undefined' || user.tz == null) {
         text += '\r\n' + replies.tzCancelWarning;
      }
      try {
         await ctx.answerCbQuery();
         const schedulesCount = (await db.GetSchedules(FormatChatId(ctx.chat.id))).length;
         await ctx.replyWithHTML(text,
            schedulesCount > 0 ? rp.ListKeyboard(language) : Markup.removeKeyboard());
         await ctx.deleteMessage();
      } catch (e) {
         console.error(e);
      }
   });
   bot.on('location', async ctx => {
      let language = await db.GetUserLanguage(ctx.from.id);
      const replies = LoadReplies(language);
      let location = ctx.message.location;
      try {
         let tz = JSON.parse(await request(`http://api.geonames.org/timezoneJSON?lat=${location.latitude}&lng=${location.longitude}&username=alordash`));
         console.log(`Received location: ${JSON.stringify(location)}`);
         console.log(`tz = ${JSON.stringify(tz)}`);
         let rawOffset = tz.rawOffset;
         let userId = ctx.from.id;
         let ts = rawOffset * 3600;
         if (!await db.HasUserID(userId)) {
            await db.AddUser(new User(userId, ts, db.defaultUserLanguage));
         } else {
            await db.SetUserTz(userId, ts);
         }
         try {
            const schedulesCount = (await db.GetSchedules(FormatChatId(ctx.chat.id))).length;
            botActions.ClearPendingConfirmation(tzPendingConfirmationUsers, trelloPendingConfirmationUsers, ctx.from.id);
            ctx.replyWithHTML(replies.tzDefined + '<b>' + rp.TzLocation(rawOffset) + '</b>',
               schedulesCount > 0 ? rp.ListKeyboard(language) : Markup.removeKeyboard());
         } catch (e) {
            console.error(e);
         }
      } catch (e) {
         console.error(e);
      }
   });
   bot.on('callback_query', async (ctx) => {
      let language = await db.GetUserLanguage(ctx.from.id);
      ctx.from.language_code = language;
      await botActions.HandleCallbackQuery(ctx, db, tzPendingConfirmationUsers)
   });

   if (!!process.env.YC_FOLDER_ID && !!process.env.YC_API_KEY) {
      bot.on('voice', async ctx => {
         let fileInfo = await ctx.telegram.getFile(ctx.message.voice.file_id);
         let voiceMessage
         let text
         console.log(`Received Voice msg`);
         if (ctx.message.voice.duration < global.MaximumVoiceMessageDuration) {
            try {
               let uri = `https://api.telegram.org/file/bot${process.env.SMART_SCHEDULER_TLGRM_API_TOKEN}/${fileInfo.file_path}`;
               voiceMessage = await request.get({ uri, encoding: null });
               text = await stt.recognize(voiceMessage);
            } catch (e) {
               console.error(e);
            }
            if (!!text) {
               ctx.message.text = text;
               let language = await db.GetUserLanguage(ctx.from.id);
               ctx.from.language_code = language;
               botActions.HandleTextMessage(bot, ctx, db, tzPendingConfirmationUsers, trelloPendingConfirmationUsers);
            }
         } else {
            try {
               ctx.replyWithHTML(rp.voiceMessageTooBig);
            } catch (e) {
               console.error(e);
            }
         }
      });
   }

   bot.on('message', async ctx => {
      console.log(`Received msg, text: ${ctx.message.text}`);
      try {
         await botActions.HandleTextMessage(bot, ctx, db, tzPendingConfirmationUsers, trelloPendingConfirmationUsers);
      } catch (e) {
         console.log(e)
      }
   });
}

module.exports = {
   InitActions
}