const { Composer } = require('telegraf');
const Extra = require('telegraf/extra');
const { LoadReplies } = require('../static/replies/repliesLoader');
const { DataBase, User, Chat } = require('../../../storage/dataBase/DataBase');
const { Schedule, GetOptions, ScheduleStates } = require('../../../storage/dataBase/TablesClasses/Schedule');
const { Decrypt, Encrypt } = require('../../../storage/encryption/encrypt');
const { TrelloManager } = require('@alordash/node-js-trello');
const { BotSendMessage, BotSendAttachment } = require('./replying');
const utils = require('../../processing/utilities');
const { Connector } = require('../../../storage/dataBase/Connector');
const { RemoveReminders } = require('../../processing/remindersOperations');
const Format = require('../../processing/formatting');
const kbs = require('../static/replies/keyboards');
const { ProcessTrelloReminder } = require('./technical');

/**@param {Composer} bot */
async function CheckExpiredSchedules(bot) {
   let pairs = await DataBase.Schedules.GetExpiredSchedules();
   console.log(`Checking ${pairs.length} expired schedules...`);
   const now = Date.now();
   let removingSchedules = [];
   for (let pair of pairs) {
      let schedule = pair.schedule;
      let chatID = schedule.chatid;
      if (chatID[0] == '_') {
         chatID = `-${chatID.substring(1)}`;
      }
      if (process.env.SMART_SCHEDULER_DEBUG_MODE === 'true' && chatID != process.env.SMART_SCHEDULER_ADMIN) {
         continue;
      }
      const lang = pair.lang;
      let expired = true;
      let decrypted = false;
      //#region Trello processing
      let trelloProcessionResult = await ProcessTrelloReminder(schedule, chatID);
      expired = trelloProcessionResult.expired;
      decrypted = trelloProcessionResult.decrypted;
      //#endregion
      if (!expired) {
         continue;
      }
      if (!decrypted) {
         schedule.text = Decrypt(schedule.text, schedule.chatid);
      }
      let keyboardButton = schedule.period_time > 0 ? kbs.CompleteReminderButton(lang) : kbs.RepeatButton(lang);
      let msgText = Format.FormReminderMessage(schedule);
      let isBlocked = false;
      let msg;
      let shouldDelete = true;
      try {
         if (schedule.file_id != '~' && schedule.file_id != null) {
            msg = await BotSendAttachment(bot, +chatID, msgText, schedule.file_id, keyboardButton, true);
         } else {
            msg = await BotSendMessage(bot, +chatID, msgText, keyboardButton, true);
         }
      } catch (e) {
         console.error(e);
         isBlocked = true;
         console.log(`The chat "${chatID}" has blocked bot`);
      }
      if (!isBlocked) {
         let repeatSchedule = new Schedule(schedule.chatid, undefined, schedule.text, schedule.username, schedule.target_date + global.repeatScheduleTime, 0, 0, schedule.file_id, ScheduleStates.repeat, msg.message_id, now, schedule.creator);
         DataBase.Schedules.AddSchedule(repeatSchedule);
         let isPeriodic = schedule.period_time > 0;
         let isLimited = schedule.max_date > 0;
         if(isPeriodic || isLimited) {
            let extraTime = schedule.target_date + schedule.period_time;
            if(!isPeriodic) {
               extraTime = schedule.max_date;
            }
            if(extraTime <= schedule.max_date || !isLimited) {
               schedule.target_date = extraTime;
               DataBase.Schedules.SetSchedule(schedule);
               shouldDelete = false;
            }
         }
      }
      if(shouldDelete || isBlocked) {
         removingSchedules.push(schedule);
      }
   }
   console.log('Done checking schedules. Removing them...');
   await DataBase.Schedules.RemoveSchedules(removingSchedules);
   console.log('Done removing schedules. Reordering them...');
   await DataBase.Schedules.ReorderMultipleSchedules(removingSchedules);
   console.log('Done expired schedules procession');
}

/**@param {Composer} bot */
async function CheckPendingSchedules(bot) {
   let schedules = await DataBase.Schedules.GetAllSchedules(GetOptions.draft);
   Connector.instance.sending = true;
   let now = Date.now();
   let deletingSchedules = [];
   for (const i in schedules) {
      const schedule = schedules[i];
      if ((now - schedule.creation_date) >= global.repeatScheduleTime) {
         deletingSchedules.push(schedule);
      }
   }
   await RemoveReminders(bot, deletingSchedules);

   Connector.instance.sending = false;
}

async function CheckDisplayStatueMessages(bot) {
   Connector.instance.sending = true;
   let schedules = await DataBase.Schedules.GetAllSchedules(GetOptions.statusDisplay);
   if (schedules.length <= 0) {
      return;
   }
   let usersCount = await DataBase.Users.GetSubscribedUsersCount();
   let schedulesCount = await DataBase.Schedules.GetTotalSchedulesCount();
   let deletingSchedules = [];
   for (const schedule of schedules) {
      let message_id = schedule.message_id;
      let text = Format.FormDisplayStatus(global.defaultUserLanguage, usersCount, schedulesCount);
      let chatid = utils.UnformatChatId(schedule.chatid);
      try {
         await bot.telegram.editMessageText(chatid, message_id, undefined, text, { parse_mode: 'HTML' });
      } catch (e) {
         console.log(e);
         if (e.description.indexOf('message is not modified') == -1) {
            deletingSchedules.push(schedule);
         }
      }
   }
   await DataBase.Schedules.RemoveSchedules(deletingSchedules);
   Connector.instance.sending = false;
}

module.exports = {
   CheckExpiredSchedules,
   CheckPendingSchedules,
   CheckDisplayStatueMessages
};