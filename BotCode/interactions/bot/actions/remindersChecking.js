const { Composer } = require('telegraf');
const Extra = require('telegraf/extra');
const { LoadReplies } = require('../static/replies/repliesLoader');
const { DataBase, Schedule, User, Chat } = require('../../../storage/dataBase/DataBase');
const { Decrypt } = require('../../../storage/encryption/encrypt');
const { TrelloManager } = require('@alordash/node-js-trello');
const { BotSendMessage, BotSendAttachment } = require('./replying');
const utils = require('./utilities');
const { Encrypt } = require('../../../storage/encryption/encrypt');
const { Connector } = require('../../../storage/dataBase/Connector');

/** @param {Composer} bot */
async function CheckExpiredSchedules(bot) {
   console.log('Checking expired schedules ' + new Date());
   Connector.instance.sending = true;
   let now = Date.now();
   let expiredSchedules = await DataBase.Schedules.CheckActiveSchedules(now);
   if (expiredSchedules.length > 0) {
      let ChatIDs = [];
      let deletingIDs = [];
      for (let schedule of expiredSchedules) {
         let chatID = schedule.chatid;
         if (chatID[0] == '_') {
            chatID = '-' + chatID.substring(1, chatID.length);
         }
         let expired = true;
         if (schedule.trello_card_id != null) {
            try {
               let chat = await DataBase.Chats.GetChatById(chatID);
               if (typeof (chat) != 'undefined' && chat.trello_token != null) {
                  let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, chat.trello_token);
                  let card = await trelloManager.GetCard(schedule.trello_card_id);
                  if (typeof (card) != 'undefined' && typeof (card.due) != 'undefined') {
                     let dueTime = new Date(card.due).getTime();
                     if (now < dueTime) {
                        expired = false;

                        if (dueTime != schedule.target_date) {
                           DataBase.Schedules.SetScheduleTargetDate(schedule.chatid, schedule.num, dueTime);
                        }

                        const cardText = Encrypt(card.desc, schedule.chatid);
                        if (cardText != schedule.text) {
                           DataBase.Schedules.SetScheduleText(schedule.chatid, schedule.num, cardText);
                        }
                     }
                  } else if (typeof (card) == 'undefined') {
                     let board = await trelloManager.GetBoard(chat.trello_board_id);
                     if (typeof (board) == 'undefined') {
                        DataBase.Chats.ClearChatFromTrello(chat.id);
                     }
                  }
               }

               if (expired) {
                  expired = now >= schedule.target_date;
               }
            } catch (e) {
               console.log(e);
            }
         }
         if (!expired) {
            continue;
         }
         console.log(`Expired schedule = ${JSON.stringify(schedule)}`);
         if (!ChatIDs.includes(schedule.chatid)) {
            ChatIDs.push(schedule.chatid);
         }
         let mentionUser = '';
         if (schedule.username != 'none') {
            mentionUser = ' @' + schedule.username;
         }
         let language = await DataBase.Users.GetUserLanguage(+chatID);
         const replies = LoadReplies(language);
         let isBlocked = false;
         try {
            let keyboard = Extra.markup((m) =>
               m.inlineKeyboard([
                  m.callbackButton(replies.repeatSchedule, `repeat`)
               ]).oneTime()
            );
            let msg;
            let remindIcon = '⏰';
            let scheduleNum = '';
            if (schedule.period_time > 0) {
               remindIcon = '🔄';
               scheduleNum = ` /${schedule.num}`
            }

            const remindText = `${remindIcon}${scheduleNum}${mentionUser} "${Decrypt(schedule.text, schedule.chatid)}"`;
            try {
               if (schedule.file_id != '~' && schedule.file_id != null) {
                  msg = await BotSendAttachment(bot, +chatID, remindText, schedule.file_id, keyboard, true);
               } else {
                  msg = await BotSendMessage(bot, +chatID, remindText, {
                     ...keyboard
                  }, true);
               }
               setTimeout(function (msg) {
                  bot.telegram.editMessageReplyMarkup(msg.chat.id, msg.message_id, Extra.markup((m) =>
                     m.inlineKeyboard([]).removeKeyboard()
                  ));
               }, global.repeatScheduleTime, msg);
            } catch (e) {
               console.error(e);
               isBlocked = true;
            }
         } catch (e) {
            console.error(e);
         }
         let shouldDelete = true;
         if (!isBlocked) {
            const nowSeconds = Date.now();
            schedule.target_date = +schedule.target_date;
            schedule.period_time = +schedule.period_time;
            schedule.max_date = +schedule.max_date;
            if (schedule.period_time >= 60 && schedule.max_date >= 60) {
               if (nowSeconds < schedule.max_date) {
                  shouldDelete = false;
                  await DataBase.Schedules.SetScheduleTargetDate(schedule.chatid, schedule.num, nowSeconds + schedule.period_time);
               }
            } else if (schedule.period_time >= 60 && schedule.max_date < 60) {
               shouldDelete = false;
               await DataBase.Schedules.SetScheduleTargetDate(schedule.chatid, schedule.num, nowSeconds + schedule.period_time);
            } else if (schedule.period_time < 60 && schedule.max_date >= 60) {
               if (nowSeconds < schedule.max_date) {
                  shouldDelete = false;
                  await DataBase.Schedules.SetScheduleTargetDate(schedule.chatid, schedule.num, schedule.max_date);
               }
            }
         }
         if (shouldDelete) {
            let index = utils.GetDeletingIDsIndex(schedule.chatid, deletingIDs);
            if (index === false) {
               deletingIDs.push({ s: `num = ${schedule.num} OR `, chatID: schedule.chatid });
            } else {
               deletingIDs[index].s += `num = ${schedule.num} OR `;
            }
         }
      }
      console.log('CHECKED, removing and reordering');
      for (let chatID of ChatIDs) {
         let index = utils.GetDeletingIDsIndex(chatID, deletingIDs);
         if (index !== false) {
            let s = deletingIDs[index].s;
            s = s.substring(0, s.length - 4);
            await DataBase.Schedules.RemoveSchedulesQuery(chatID, s);
         }
         await DataBase.Schedules.ReorderSchedules(chatID);
      }
      console.log('Removed and reordered.');
   }
   Connector.instance.sending = false;
   console.log(`Done checking expired schedules`);
}

/**@param {Composer} bot */
async function CheckPendingSchedules(bot) {
   let schedules = await DataBase.Schedules.GetAllSchedules(Schedule.GetOptions.pending);
   Connector.instance.sending = true;
   let now = Date.now();
   for (const i in schedules) {
      const schedule = schedules[i];
      let chatid = schedule.chatid;
      if (chatid[0] == '_') {
         chatid = - +(chatid.substring(1));
      } else {
         chatid = +chatid;
      }
      const msg = await bot.telegram.callApi("getHistory", { peer: chatid, offset_id: schedule.message_id });
      console.log('msg :>> ', msg);
   }

   Connector.instance.sending = false
}

module.exports = {
   CheckExpiredSchedules,
   CheckPendingSchedules
};