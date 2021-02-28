const { ParsedDate } = require('@alordash/date-parser');
const { Schedule, User } = require('../backend/dataBase/db');
const { isTimeType } = require('@alordash/date-parser/lib/date-cases');
const { TimeListIsEmpty } = require('../backend/timeProcessing');
const { Language, LoadReplies } = require('./replies/replies');
const { trelloAddBoardCommand, trelloAddListCommand } = require('./bot/botCommands');

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
 * @returns {String}
 */
function FormStringFormatSchedule(schedule, tz, language, showDayOfWeek) {
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
   return `/${schedule.id}. <b>${FormDateStringFormat(target_date, language, showDayOfWeek)}</b> "${schedule.text}"${file}${username}${until}${period}`;
}

/**
 * @param {Array} boardsList 
 * @param {String} language 
 * @param {User} user 
 */
function FormBoardsList(boardsList, language, user) {
   const replies = LoadReplies(language);
   let reply = `${replies.trelloShowBoards}\r\n`;
   let i = 1;
   for (const board of boardsList) {
      let extra = '';
      if(user.trello_boards.indexOf(board.id) >= 0) {
         extra = ` 📌
   id: <b>${board.id}</b>`;
      }
      reply += `  ${trelloAddBoardCommand}${i} | <a href="${board.shortUrl}">${board.name}</a>${extra}\r\n`;
      i++;
   }
   return reply;
}

/**
 * @param {*} board 
 * @param {Languages} language 
 */
function FormBoardListsList(board, language) {
   const replies = LoadReplies(language);
   let reply = `${replies.trelloBoardListsList0} "<a href="${board.shortUrl}">${board.name}</a>" ${replies.trelloBoardListsList1}\r\n`;
   let i = 1;
   for(const list of board.lists) {
      reply += `${trelloAddListCommand}${i} | "<b>${list.name}</b>"\r\n`;
      i++;
   }
   return `${reply}${replies.trelloBoardListsListEnd}`
}

module.exports = {
   TimeListIsEmpty,
   FormDateStringFormat,
   FormPeriodStringFormat,
   FormStringFormatSchedule,
   FormBoardsList,
   FormBoardListsList
}