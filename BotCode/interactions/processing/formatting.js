const { ParsedDate } = require('@alordash/date-parser');
const { DataBase, Schedule, User } = require('../../storage/dataBase/DataBase');
const { isTimeType } = require('@alordash/date-parser/lib/date-cases/date-cases');
const { TimeListIsEmpty } = require('./timeProcessing');
const { Language, LoadReplies } = require('../bot/static/replies/repliesLoader');
const { trelloAddListCommand } = require('../bot/static/commandsList');
const { TrelloManager } = require('@alordash/node-js-trello');

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

/**
 * @param {Schedule} schedule
 * @param {Number} tz 
 * @param {Language} language 
 * @param {Boolean} showDayOfWeek 
 * @param {Boolean} showNum 
 * @returns {String}
 */
async function FormStringFormatSchedule(schedule, tz, language, showDayOfWeek, showNum) {
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
   if (schedule.username != 'none' && schedule.username != null) {
      username = ` (<b>${schedule.username}</b>)`;
   }
   let file = (schedule.file_id != '~' && schedule.file_id != null) ? ' 💾' : '';

   let text = schedule.text;
   if (schedule.trello_card_id != null) {
      let chatID = schedule.chatid;
      if (chatID[0] == '_') {
         chatID = '-' + chatID.substring(1);
      }
      let chat = await DataBase.Chats.GetChatById(chatID);
      if (typeof (chat) != 'undefined' && chat.trello_token != null) {
         let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, chat.trello_token);
         let card = await trelloManager.GetCard(schedule.trello_card_id);
         if (typeof (card) != 'undefined') {
            text = `<a href="${card.shortUrl}">${text}</a>`;
         }
      }
   }
   let numText = showNum ? `/${schedule.num}. ` : '';
   return `${numText}<b>${FormDateStringFormat(target_date, language, showDayOfWeek)}</b> "${text}"${file}${username}${until}${period}`;
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

/**
 * @param {String} str 
 * @param {Boolean} newline 
 * @param {Languages} language 
 * @returns {String} 
 */
function Deleted(str, newline, language) {
   const replies = LoadReplies(language);
   return `${replies.deleted} ${str}. ${newline === false ? replies.showList : ``}`;
}

/**
 * @param {Number} hours 
 * @param {Number} minutes 
 * @param {Boolean} isNegative 
 * @returns {String} 
 */
function TzDetermined(hours, minutes, isNegative) {
   let s = '+'
   let t = '';
   if (isNegative) {
      s = '-';
      hours *= -1;
   }
   if (hours < 10) {
      t = '0';
   }
   s += t + hours + ':';
   t = '0';
   if (minutes >= 10) {
      t = '';
   }
   s += t + minutes;
   return s;
}

/**
 * @param {Number} tz 
 * @returns {String} 
 */
function TzCurrent(tz) {
   let negative = tz < 0;
   let hour = tz / 3600 | 0;
   let minutes = Math.abs(tz % 3600 / 60);
   return TzDetermined(hour, minutes, negative);
}

/**
 * @param {String} text 
 * @param {String} myFormattedDate 
 * @param {Languages} language 
 * @returns {String} 
 */
function Scheduled(text, myFormattedDate, language) {
   const replies = LoadReplies(language);
   return `"${text}" ${replies.alreadyScheduled} <b>${myFormattedDate}</b>\r\n`;
}

/**
 * @param {String} trello_key 
 * @param {String} app_name 
 * @param {Languages} language 
 */
function TrelloAuthorizationMessage(trello_key, app_name, language) {
   const replies = LoadReplies(language);
   let link = `https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&name=${app_name}&key=${trello_key}`;
   return `${replies.trelloAuthenticate0}${link}${replies.trelloAuthenticate1}`;
}

/**
 * @param {Languages} language 
 * @param {String} link 
 * @returns {String} 
 */
function TrelloInfoLink(language, link) {
   const replies = LoadReplies(language);
   return `${replies.trelloInfoLink} ${link}`;
}

/**
 * @param {Languages} language 
 * @param {Number} usersCount 
 * @param {Number} schedulesCount 
 * @returns {String}
 */
function FormDisplayStatus(language, usersCount, schedulesCount) {
   const replies = LoadReplies(language);
   return `${replies.displayStatus0}${usersCount}
${replies.displayStatus1}${schedulesCount}
${replies.displayStatus2}`;
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
   SplitBigMessage,
   Deleted,
   TzCurrent,
   Scheduled,
   TrelloAuthorizationMessage,
   TrelloInfoLink,
   FormDisplayStatus
}