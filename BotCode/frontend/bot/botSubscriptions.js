const fs = require('fs');
const path = require('path');
const request = require('request-promise');
const { Languages, LoadReplies } = require('../replies/replies');
const rp = require('../replies/replies');
const botActions = require('./botActions');
const { Composer } = require('telegraf');
const { dbManagement, User } = require('../../backend/dataBase/db');
const { speechToText } = require('../../backend/stt/stt');
const { pathToFileURL } = require('url');
const stt = new speechToText(process.env.YC_API_KEY, process.env.YC_FOLDER_ID);

let tzPendingConfirmationUsers = [];

/**
 * @param {Composer} bot 
 * @param {dbManagement} db 
 */
exports.InitActions = function (bot, db) {
   bot.start(ctx => {
      const replies = LoadReplies(Languages.general);
      let options = rp.MainKeyboard(Languages.EN);
      options['disable_web_page_preview'] = true;
      try {
         ctx.replyWithHTML(replies.start, options);
      } catch (e) {
         console.error(e);
      }
   });
   bot.help(async ctx => {
      let language = await db.GetUserLanguage(ctx.from.id);
      const replies = LoadReplies(language);
      try {
         ctx.replyWithHTML(replies.commands, rp.MainKeyboard(language));
      } catch (e) {
         console.error(e);
      }
   });

   bot.command('list', async ctx => {
      let tz = await db.GetUserTZ(ctx.from.id);
      let language = await db.GetUserLanguage(ctx.from.id);
      let chatID = botActions.FormatChatId(ctx.chat.id);
      await ctx.replyWithHTML(await botActions.LoadSchedulesList(chatID, tz, db, language));
   });
   bot.command('del', async ctx => {
      let language = await db.GetUserLanguage(ctx.from.id);
      ctx.from.language_code = language;
      await botActions.DeleteSchedules(ctx, db);
   });
   bot.command('tz', async ctx => {
      try {
         let language = await db.GetUserLanguage(ctx.from.id);
         ctx.from.language_code = language;
         await botActions.StartTimeZoneDetermination(ctx, db, tzPendingConfirmationUsers);
      } catch (e) {
         console.error(e);
      }
   });
   bot.command('kb', async ctx => {
      let language = await db.GetUserLanguage(ctx.from.id);
      const replies = LoadReplies(language);
      try {
         ctx.replyWithHTML(replies.showKeyboard, rp.MainKeyboard(language));
      } catch (e) {
         console.error(e);
      }
   });
   console.log('__dirname :>> ', __dirname);
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
         if (typeof (replies.tzCancel) != 'undefined') {
            bot.hears(replies.tzCancel, async ctx => {
               tzPendingConfirmationUsers.splice(tzPendingConfirmationUsers.indexOf(ctx.from.id), 1);
               let reply = replies.tzCancelReponse;
               if (!await db.HasUserID(ctx.from.id)) {
                  reply += '\r\n' + replies.tzCancelWarning;
               }
               try {
                  ctx.replyWithHTML(reply, rp.MainKeyboard(language));
               } catch (e) {
                  console.error(e);
               }
            });
         }
         if (typeof (replies.showListAction) != 'undefined') {
            bot.hears(replies.showListAction, async ctx => {
               let chatID = botActions.FormatChatId(ctx.chat.id);
               let tz = await db.GetUserTZ(ctx.from.id);
               try {
                  return await ctx.replyWithHTML(await botActions.LoadSchedulesList(chatID, tz, db, language));
               } catch (e) {
                  console.error(e);
               }
            });
         }
         if (typeof (replies.changeTimeZoneAction) != 'undefined') {
            bot.hears(replies.changeTimeZoneAction, async ctx => {
               return await botActions.StartTimeZoneDetermination(ctx, db, tzPendingConfirmationUsers);
            });
         }
      }
   }

   bot.action('tz cancel', async ctx => {
      let language = await db.GetUserLanguage(ctx.from.id);
      const replies = LoadReplies(language);
      tzPendingConfirmationUsers.splice(tzPendingConfirmationUsers.indexOf(ctx.from.id), 1);
      let text = rpreplies.tzCancelReponse;
      if (!await db.HasUserID(ctx.from.id)) {
         text += '\r\n' + replies.tzCancelWarning;
      }
      try {
         ctx.editMessageText('...');
         await ctx.answerCbQuery();
         await ctx.replyWithHTML(text, rp.MainKeyboard(language));
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
            ctx.replyWithHTML(replies.tzDefined + '<b>' + rp.TzLocation(rawOffset) + '</b>', rp.MainKeyboard(language));
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
      await botActions.HandleCallbackQuery(ctx, db)
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
               botActions.HandleTextMessage(ctx, db, tzPendingConfirmationUsers);
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

   bot.on('text', async ctx => {
      console.log(`Received msg`);
      await botActions.HandleTextMessage(ctx, db, tzPendingConfirmationUsers);
   });
}