const request = require('request-promise');
const { Languages, LoadReplies } = require('../static/replies/repliesLoader');
const rp = require('../static/replies/repliesLoader');
const kbs = require('../static/replies/keyboards');
const botActions = require('../actions/botActions');
const { Composer } = require('telegraf');
const { dbManagement } = require('../../../storage/dataBase/db');
const { speechToText } = require('../actions/stt/stt');
const stt = new speechToText(process.env.YC_API_KEY, process.env.YC_FOLDER_ID);
const { BotReply } = require('../actions/replying');

/**
 * @param {Composer} bot 
 * @param {dbManagement} db 
 * @param {Array.<String>} tzPendingConfirmationUsers 
 * @param {Array.<String>} trelloPendingConfirmationUsers 
 * @param {Array.<Array.<Schedule>>} pendingSchedules 
 * @param {Array.<Schedule>} invalidSchedules 
 */
function InitBasicSubscriptions(bot, db, tzPendingConfirmationUsers, trelloPendingConfirmationUsers, pendingSchedules, invalidSchedules) {
   bot.start(async ctx => {
      const replies = LoadReplies(Languages.general);
      try {
         let inlineKeyboard = kbs.TzDeterminationOnStartInlineKeyboard(Languages.general);
         inlineKeyboard['disable_web_page_preview'] = true;
         BotReply(ctx, replies.start, inlineKeyboard);
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

   if (!!process.env.YC_FOLDER_ID && !!process.env.YC_API_KEY) {
      bot.on('voice', async ctx => {
         let fileInfo;
         try {
            fileInfo = await ctx.telegram.getFile(ctx.message.voice.file_id);
         } catch (e) {
            console.log(e);
         }
         console.log(`Received Voice msg`);
         if (ctx.message.voice.duration < global.MaximumVoiceMessageDuration) {
            let text;
            try {
               let uri = `https://api.telegram.org/file/bot${process.env.SMART_SCHEDULER_TLGRM_API_TOKEN}/${fileInfo.file_path}`;
               let voiceMessage = await request.get({ uri, encoding: null });
               text = await stt.recognize(voiceMessage);
            } catch (e) {
               console.error(e);
            }
            if (text == '') {
               return;
            }
            ctx.message.text = text;
            let language = await db.GetUserLanguage(ctx.from.id);
            ctx.from.language_code = language;
            botActions.HandleTextMessage(bot, ctx, db, tzPendingConfirmationUsers, trelloPendingConfirmationUsers, pendingSchedules, invalidSchedules, 20);
         } else {
            try {
               BotReply(ctx, rp.voiceMessageTooBig);
            } catch (e) {
               console.error(e);
            }
         }
      });
   }

   bot.on('message', async ctx => {
      try {
         botActions.HandleTextMessage(bot, ctx, db, tzPendingConfirmationUsers, trelloPendingConfirmationUsers, pendingSchedules, invalidSchedules);
      } catch (e) {
         console.log(e)
      }
   });
}

module.exports = InitBasicSubscriptions;