const Extra = require('telegraf/extra');
const { User } = require('../../storage/dataBase/DataBase');
const { LoadReplies } = require('./static/replies/repliesLoader');
const Subscriptions = require('./subscriptions/all');
const { InlineSchedules } = require('./actions/handling/inlineQuery');

/**@type {Array.<String>} */
let tzPendingConfirmationUsers = [];
/**@type {Array.<String>} */
let trelloPendingConfirmationUsers = [];
/**@type {InlineSchedules} */
let inlineSchedules = [];

var i = 0;
var errorsCount = 0;

/**@param {String} inviteLink 
 * @param {Array.<User>} users 
 */
function sendNotification(bot, inviteLink, users) {
   const length = users.length;
   let delay = Math.floor(Math.random() * 200) + 100;
   setTimeout(async function (delay, inviteLink, users) {
      const user = users[i];
      const replies = LoadReplies(user.lang);
      const keyboard = Extra.markup((m) =>
         m.inlineKeyboard([
            m.callbackButton(replies.unsubscribe, `unsubscribe`)
         ]).oneTime()
      );
      try {
         if (user.subscribed) {
            if (typeof (await bot.telegram.sendMessage(user.id, `${replies.invite} ${inviteLink}</b>`,
               {
                  parse_mode: 'HTML',
                  ...keyboard
               })) != 'undefined') {
               console.log(`#${i} Success. Target :>> ${user.id}, delay :>> ${delay}`);
            } else {
               errorsCount++;
               console.log(`#${i} Error.   Target :>> ${user.id}, delay :>> ${delay}`);
            }
         }
      } catch (e) {
         console.error(e);
         errorsCount++;
      } finally {
         i++;
         if (i < length) {
            sendNotification(bot, inviteLink, users);
         } else {
            try {
               bot.telegram.sendMessage(process.env.SMART_SCHEDULER_ADMIN, `Sent all invites, errors count: ${errorsCount}`);
            } catch (e) {
               console.error(e);
            }
         }
      }
   }, delay, delay, inviteLink, users);
}

/**@param {*} bot */
exports.InitBot = async function (bot) {
   const subscriptionsArgs = [bot, tzPendingConfirmationUsers, trelloPendingConfirmationUsers, inlineSchedules];
   await Subscriptions.initCommands(...subscriptionsArgs);
   await Subscriptions.initAdvanced(...subscriptionsArgs);
   await Subscriptions.initBasic(...subscriptionsArgs);
   await bot.launch();

   if (process.env.SMART_SCHEDULER_SEND_INVITE === 'true'
      && process.env.SMART_SCHEDULER_INVITE.length > 0) {
      sendNotification(bot, process.env.SMART_SCHEDULER_INVITE, users);
   }
};