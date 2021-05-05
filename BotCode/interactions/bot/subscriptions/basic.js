const request = require('request-promise');
const { Languages, LoadReplies } = require('../static/replies/repliesLoader');
const rp = require('../static/replies/repliesLoader');
const kbs = require('../static/replies/keyboards');
const { Composer } = require('telegraf');
const { DataBase } = require('../../../storage/dataBase/DataBase');
const { speechToText } = require('../actions/stt/stt');
const stt = new speechToText(process.env.YC_API_KEY, process.env.YC_FOLDER_ID);
const { BotReply } = require('../actions/replying');
const { HelpCommand, HandleTextMessage } = require('../actions/handling/textMessage');

/**
 * @param {Composer} bot 
 * @param {Array.<String>} tzPendingConfirmationUsers 
 * @param {Array.<String>} trelloPendingConfirmationUsers 
 * @param {Array.<Schedule>} invalidSchedules 
 */
function InitBasicSubscriptions(bot, tzPendingConfirmationUsers, trelloPendingConfirmationUsers, invalidSchedules) {
   bot.start(async ctx => {
      const replies = LoadReplies(ctx.from.language_code);
      try {
         let inlineKeyboard = kbs.TzDeterminationOnStartInlineKeyboard(ctx.from.language_code);
         inlineKeyboard['disable_web_page_preview'] = true;
         BotReply(ctx, replies.start, inlineKeyboard);
      } catch (e) {
         console.error(e);
      }
   });
   bot.help(async ctx => {
      try {
         HelpCommand(ctx);
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
            let language = await DataBase.Users.GetUserLanguage(ctx.from.id);
            ctx.from.language_code = language;
            HandleTextMessage(bot, ctx, tzPendingConfirmationUsers, trelloPendingConfirmationUsers, invalidSchedules, 20);
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
         HandleTextMessage(bot, ctx, tzPendingConfirmationUsers, trelloPendingConfirmationUsers, invalidSchedules);
      } catch (e) {
         console.log(e)
      }
   });
}

module.exports = InitBasicSubscriptions;