const botActions = require('../actions/botActions');
const { FormatChatId } = require('../actions/utilities');
const { Composer } = require('telegraf');
const { dbManagement } = require('../../../storage/dataBase/db');
const cms = require('../static/commandsList');
const { BotReply } = require('../actions/replying');
const { TrelloCommand } = require('../actions/handling/trelloCommands');

/**
 * @param {Composer} bot 
 * @param {dbManagement} db 
 * @param {Array.<String>} tzPendingConfirmationUsers 
 * @param {Array.<String>} trelloPendingConfirmationUsers 
 */
function InitCommandsSubscriptions(bot, db, tzPendingConfirmationUsers, trelloPendingConfirmationUsers) {
   bot.command(cms.listSchedules, async ctx => {
      let tz = await db.GetUserTZ(ctx.from.id);
      let language = await db.GetUserLanguage(ctx.from.id);
      let chatID = FormatChatId(ctx.chat.id);
      let answers = await botActions.LoadSchedulesList(chatID, tz, db, language);
      for (const answer of answers) {
         try {
            BotReply(ctx, answer, { disable_web_page_preview: true });
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
         TrelloCommand(user, ctx, db, trelloPendingConfirmationUsers);
      } catch (e) {
         console.error(e);
      }
   });
   bot.command(cms.trelloPinBoardCommand, async ctx => {
      try {
         let user = await db.GetUserById(ctx.from.id);
         botActions.TrelloPinCommand(ctx, db, user);
      } catch (e) {
         console.error(e);
      }
   });
   bot.command(cms.trelloUnpinBoardCommand, async ctx => {
      try {
         let user = await db.GetUserById(ctx.from.id);
         botActions.TrelloUnpinCommand(ctx, db, user);
      } catch (e) {
         console.log(e);
      }
   });
}

module.exports = InitCommandsSubscriptions;