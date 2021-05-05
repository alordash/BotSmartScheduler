const fs = require('fs');
const path = require('path');
const request = require('request-promise');
const { LoadReplies } = require('../static/replies/repliesLoader');
const Format = require('../../processing/formatting');
const kbs = require('../static/replies/keyboards');
const utils = require('../actions/utilities');
const technicalActions = require('../actions/technical');
const { FormatChatId } = require('../actions/utilities');
const { Composer } = require('telegraf');
const { DataBase, User } = require('../../../storage/dataBase/DataBase');
const Markup = require('telegraf/markup');
const { BotReply } = require('../actions/replying');
const HandleCallbackQueries = require('../actions/handling/callbackQueries/callbackQueries');

/**
 * @param {Composer} bot 
 * @param {Array.<String>} tzPendingConfirmationUsers 
 * @param {Array.<String>} trelloPendingConfirmationUsers 
 */
function InitAdvancedSubscriptions(bot, tzPendingConfirmationUsers, trelloPendingConfirmationUsers) {
   console.log('__dirname :>> ', __dirname);
   let repliesFiles;
   try {
      repliesFiles = fs.readdirSync(__dirname.substring(0, __dirname.lastIndexOf('/')) + '/static/replies');
   } catch (e) {
      repliesFiles = fs.readdirSync(path.join(__dirname, '..', 'static', 'replies'));
   }
   console.log('repliesFiles :>> ', repliesFiles);
   for (const filename of repliesFiles) {
      if (path.extname(filename) != '.json') {
         continue;
      }
      const language = path.basename(filename, '.json');
      const replies = LoadReplies(language);
      if (typeof (replies.tzUseLocation) != 'undefined') {
         bot.hears(replies.tzUseLocation, ctx => {
            try {
               BotReply(ctx, replies.tzUseLocationResponse);
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
               BotReply(ctx, replies.tzTypeManuallyReponse);
            } catch (e) {
               console.error(e);
            }
         });
      }
      if (typeof (replies.cancel) != 'undefined') {
         bot.hears(replies.cancel, async ctx => {
            utils.ClearPendingConfirmation(tzPendingConfirmationUsers, trelloPendingConfirmationUsers, ctx.from.id);
            let reply = replies.cancelReponse;
            let user = await DataBase.Users.GetUserById(ctx.from.id, true);
            if (typeof (user) == 'undefined' || user.tz == null) {
               reply += '\r\n' + replies.tzCancelWarning;
            }
            try {
               BotReply(ctx, reply, await kbs.LogicalListKeyboard(language, FormatChatId(ctx.chat.id)));
            } catch (e) {
               console.error(e);
            }
         });
      }
      if (typeof (replies.showListAction) != 'undefined') {
         bot.hears(replies.showListAction, async ctx => {
            let chatID = FormatChatId(ctx.chat.id);
            let tz = (await DataBase.Users.GetUserById(ctx.from.id)).tz;
            let answers = await technicalActions.LoadSchedulesList(chatID, tz, language);
            for (const answer of answers) {
               try {
                  BotReply(ctx, answer, { disable_web_page_preview: true });
               } catch (e) {
                  console.error(e);
               }
            }
         });
      }
   }

   bot.on('location', async ctx => {
      let language = await DataBase.Users.GetUserLanguage(ctx.from.id);
      const replies = LoadReplies(language);
      let location = ctx.message.location;
      try {
         let tz = JSON.parse(await request(`http://api.geonames.org/timezoneJSON?lat=${location.latitude}&lng=${location.longitude}&username=alordash`));
         console.log(`Received location: ${JSON.stringify(location)}`);
         console.log(`tz = ${JSON.stringify(tz)}`);
         let rawOffset = tz.rawOffset;
         let userId = ctx.from.id;
         let ts = rawOffset * 3600;
         if (!await DataBase.Users.HasUserID(userId)) {
            await DataBase.Users.AddUser(new User(userId, ts, global.defaultUserLanguage));
         } else {
            await DataBase.Users.SetUserTz(userId, ts);
         }
         try {
            utils.ClearPendingConfirmation(tzPendingConfirmationUsers, trelloPendingConfirmationUsers, ctx.from.id);
            BotReply(ctx, replies.tzDefined + '<b>' + Format.TzLocation(rawOffset) + '</b>', await kbs.LogicalListKeyboard(language, FormatChatId(ctx.chat.id)));
         } catch (e) {
            console.error(e);
         }
      } catch (e) {
         console.error(e);
      }
   });

   bot.on('callback_query', async (ctx) => {
      let language = await DataBase.Users.GetUserLanguage(ctx.from.id);
      ctx.from.language_code = language;
      HandleCallbackQueries(ctx, tzPendingConfirmationUsers, trelloPendingConfirmationUsers);
   });
}

module.exports = InitAdvancedSubscriptions;