const technicalActions = require('../actions/technical');
const { FormatChatId } = require('../../processing/utilities');
const { Composer } = require('telegraf');
const { DataBase } = require('../../../storage/dataBase/DataBase');
const cms = require('../static/commandsList');
const { BotReply } = require('../actions/replying');
const { TrelloCommand, TrelloPinCommand, TrelloUnpinCommand } = require('../actions/handling/trelloCommands');

/**
 * @param {Composer} bot 
 * @param {Array.<String>} tzPendingConfirmationUsers 
 * @param {Array.<String>} trelloPendingConfirmationUsers 
 */
function InitCommandsSubscriptions(bot, tzPendingConfirmationUsers, trelloPendingConfirmationUsers) {
   bot.command(cms.listSchedules, async ctx => {
      let tz = (await DataBase.Users.GetUserById(ctx.from.id)).tz;
      let language = await DataBase.Users.GetUserLanguage(ctx.from.id);
      let chatID = FormatChatId(ctx.chat.id);
      let answers = await technicalActions.LoadSchedulesList(chatID, tz, language);
      for (const answer of answers) {
         try {
            BotReply(ctx, answer, { disable_web_page_preview: true });
         } catch (e) {
            console.error(e);
         }
      }
   });
   bot.command(cms.deleteSchedules, async ctx => {
      let language = await DataBase.Users.GetUserLanguage(ctx.from.id);
      ctx.from.language_code = language;
      technicalActions.DeleteSchedules(ctx);
   });
   bot.command(cms.changeTimeZone, async ctx => {
      try {
         let language = await DataBase.Users.GetUserLanguage(ctx.from.id);
         ctx.from.language_code = language;
         technicalActions.StartTimeZoneDetermination(ctx, tzPendingConfirmationUsers);
      } catch (e) {
         console.error(e);
      }
   });
   bot.command(cms.trelloInit, async ctx => {
      try {
         let user = await DataBase.Users.GetUserById(ctx.from.id);
         TrelloCommand(user, ctx, trelloPendingConfirmationUsers);
      } catch (e) {
         console.error(e);
      }
   });
   bot.command(cms.trelloPinBoardCommand, async ctx => {
      try {
         let user = await DataBase.Users.GetUserById(ctx.from.id);
         TrelloPinCommand(ctx, user);
      } catch (e) {
         console.error(e);
      }
   });
   bot.command(cms.trelloUnpinBoardCommand, async ctx => {
      try {
         let user = await DataBase.Users.GetUserById(ctx.from.id);
         TrelloUnpinCommand(ctx, user);
      } catch (e) {
         console.log(e);
      }
   });
   bot.command(cms.displayStatus, async ctx => {
      try {
         technicalActions.StartDisplayingStatus(ctx);
      } catch (e) {
         console.log(e);
      }
   });
}

module.exports = InitCommandsSubscriptions;