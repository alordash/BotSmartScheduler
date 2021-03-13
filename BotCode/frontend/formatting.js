const { ParsedDate } = require('@alordash/date-parser');
const { Schedule, User } = require('../backend/dataBase/db');
const { isTimeType } = require('@alordash/date-parser/lib/date-cases');
const { TimeListIsEmpty } = require('../backend/timeProcessing');
const { Language, LoadReplies } = require('./replies/replies');
const { trelloAddListCommand } = require('./bot/botCommands');
const { TrelloManager } = require('@alordash/node-js-trello');
const { dbManagement } = require('../backend/dataBase/db');

/**@param {Date} date 
 * @param {Language} language 
 * @param {Boolean} showDayOfWeek 
 * @returns {String} 
 */
function FormDateStringFormat(date, language, showDayOfWeek) {
   const replies = LoadReplies(language);
   let month = date.getMonth();
   let hour = date.getHours().toString(10),
      minute = date.getMinutes().toString(10);
   if (hour.length <= 1) {
      hour = `0${hour}`;
   }
   if (minute.length <= 1) {
      minute = `0${minute}`;
   }
   let year = '';
   if (date.getFullYear() != new Date().getFullYear()) {
      year = ` ${date.getFullYear()} ${replies.year}`;
   }

   let dayOfWeek = '';
   if (showDayOfWeek && (date.getTime() - Date.now() > 24 * 60 * 60 * 1000)) {
      dayOfWeek = ` (${replies.daysOfWeek[date.getDay()]})`;
   }
   return `${date.getDate()} ${replies.months[month]} ${hour}:${minute}${year}${dayOfWeek}`;
}

/**@param {Number} period_time 
 * @param {Language} language 
 * @returns {String} 
 */
function FormPeriodStringFormat(period_time, language) {
   let result = '';
   const replies = LoadReplies(language);
   const minutes = Math.floor((period_time % 3600) / 60);
   const hours = Math.floor((period_time % (24 * 3600)) / 3600);
   const days = Math.floor(period_time / (24 * 3600));
   if (minutes > 0) {
      result = `${minutes} (${replies.timeTypes.minutes}) ${result}`;
   }
   if (hours > 0) {
      result = `${hours} (${replies.timeTypes.hours}) ${result}`;
   }
   if (days > 0) {
      result = `${days} (${replies.timeTypes.dates}) ${result}`;
   }
   return result.trim();
}

/**@param {Schedule} schedule
 * @param {Number} tz 
 * @param {Language} language 
 * @param {Boolean} showDayOfWeek 
 * @param {dbManagement} db
 * @returns {String}
 */
async function FormStringFormatSchedule(schedule, tz, language, showDayOfWeek, db) {
   let period_time = schedule.period_time.div(1000);
   let target_date = new Date(schedule.target_date + tz * 1000);
   console.log(`FORMATTING target_date: ${schedule.target_date}, tz: ${tz}, will be: ${schedule.target_date + tz * 1000}`);
   let max_date = new Date(schedule.max_date + tz * 1000);
   const replies = LoadReplies(language);

   let until = '';
   let period = '';
   if (max_date.getTime() >= Date.now()) {
      until = `\r\n      ${replies.until} <b>${FormDateStringFormat(max_date, language, showDayOfWeek)}</b>`;
   }
   if (period_time >= 60) {
      period = `\r\n      ${replies.everyTime} <b>${FormPeriodStringFormat(period_time, language)}</b>`;
   }
   let username = '';
   if (schedule.username != 'none') {
      username = ` (<b>${schedule.username}</b>)`;
   }
   let file = (schedule.file_id != '~' && schedule.file_id != null) ? ' 💾' : '';

   let text = schedule.text;
   if (schedule.trello_card_id != null) {
      let chatID = schedule.chatid;
      if (chatID[0] == '_') {
         chatID = '-' + chatID.substring(1);
      }
      let chat = await db.GetChatById(chatID);
      if (typeof (chat) != 'undefined' && chat.trello_token != null) {
         let trelloManager = new TrelloManager(process.env.TRELLO_KEY, chat.trello_token);
         let card = await trelloManager.GetCard(schedule.trello_card_id);
         if (typeof (card) != 'undefined') {
            text = `<a href="${card.shortUrl}">${text}</a>`;
         }
      }
   }
   return `/${schedule.id}. <b>${FormDateStringFormat(target_date, language, showDayOfWeek)}</b> "${text}"${file}${username}${until}${period}`;
}

/**
 * @param {*} board 
 * @returns {String}
 */
function FormBoardLink(board) {
   return `<a href="${board.shortUrl}">${board.name}</a>`;
}

/**
 * @param {Array} boardsList 
 * @param {String} language 
 * @returns {String}
 */
function FormBoardsList(boardsList, language) {
   const replies = LoadReplies(language);
   let reply = `${replies.trelloShowBoards}\r\n`;
   for (const board of boardsList) {
      reply += `• ${FormBoardLink(board)}
   id: <b>${board.id}</b>\r\n`;
   }
   return reply;
}

/**
 * @param {*} board 
 * @param {Languages} language 
 * @returns {String}
 */
function FormBoardListsList(board, language) {
   const replies = LoadReplies(language);
   let reply = `${replies.trelloBoardListsList0} "${FormBoardLink(board)}" ${replies.trelloBoardListsList1}\r\n`;
   let i = 1;
   for (const list of board.lists) {
      reply += `${trelloAddListCommand}${i} | "<b>${list.name}</b>"\r\n`;
      i++;
   }
   return `${reply}${replies.trelloBoardListsListEnd}`
}

/**
 * @param {*} board 
 * @param {*} list 
 * @param {Language} language 
 * @returns {String}
 */
function FormListBinded(board, list, language) {
   const replies = LoadReplies(language);
   return `${replies.trelloListBinded0} "<b>${list.name}</b>" ${replies.trelloListBinded1} "${FormBoardLink(board)}".`;
}

/**
 * @param {*} board 
 * @param {Languages} language 
 * @returns {String}
 */
function FormBoardUnbinded(board, language) {
   const replies = LoadReplies(language);
   return `${replies.trelloBoardUnbinded0} "${FormBoardLink(board)}" ${replies.trelloBoardUnbinded1}`;
}

function FormAlreadyBoardBinded(board, list, language) {
   const replies = LoadReplies(language);
   return `${replies.trelloBoardAlreadyBinded0} "${FormBoardLink(board)}"\r\n${replies.trelloBoardAlreadyBinded1} "<b>${list.name}</b>"`;
}

/**
 * @param {String} text 
 * @returns {Array.<String>}
 */
function SplitBigMessage(text) {
   let answers = [];
   while (text.length > global.MaxMessageLength) {
      answers.push(text.substring(0, global.MaxMessageLength - 1));
      text = text.slice(global.MaxMessageLength);
   }
   answers.push(text);
   return answers;
}

module.exports = {
   TimeListIsEmpty,
   FormDateStringFormat,
   FormPeriodStringFormat,
   FormStringFormatSchedule,
   FormBoardsList,
   FormBoardListsList,
   FormListBinded,
   FormBoardUnbinded,
   FormAlreadyBoardBinded,
   SplitBigMessage
}