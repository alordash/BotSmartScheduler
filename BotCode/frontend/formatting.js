const { ParsedDate } = require('@alordash/date-parser');
const { Schedule } = require('../backend/dataBase/db');
const { isTimeType } = require('@alordash/date-parser/lib/date-cases');
const { TimeListIsEmpty } = require('../backend/timeProcessing');
const { Language, GetMonthsNames, LoadReplies } = require('./replies/replies');

/**@param {Date} date 
 * @param {Language} language 
 * @returns {String} 
 */
function FormDateStringFormat(date, language) {
   let month = date.getMonth();
   let hour = date.getHours().toString(10),
      minute = date.getMinutes().toString(10);
   if (hour.length <= 1) {
      hour = '0' + hour;
   }
   if (minute.length <= 1) {
      minute = '0' + minute;
   }
   let year = '';
   if (date.getFullYear() != new Date().getFullYear()) {
      year = ` ${date.getFullYear()} г.`;
   }
   return `${date.getDate()} ${GetMonthsNames(language)[month]} ${hour}:${minute}${year}`;
}

/**@param {ParsedDate} parsedDate 
 * @param {Language} language 
 * @returns {String} 
 */
function FormPeriodStringFormat(parsedDate, language) {
   let result = '';
   const replies = LoadReplies(language);
   for (const timeType in parsedDate.period_time) {
      if (typeof (parsedDate.period_time[timeType]) != 'undefined' && isTimeType(timeType)) {
         let num = parsedDate.period_time[timeType];
         if (timeType == 'years') {
            num -= 1970;
         } else if (timeType == 'dates') {
            num--;
         }
         if (num > 0) {
            result = `${num} (${replies.timeTypes[timeType]}) ${result}`;
         }
      }
   }
   return result.trim();
}

/**@param {Schedule} schedule
 * @param {ParsedDate} parsedDate 
 * @param {Number} tz 
 * @param {Language} language 
 * @returns {String}
 */
function FormStringFormatSchedule(schedule, parsedDate, tz, language) {
   let target_date = new Date(schedule.target_date + tz * 1000);
   console.log(`FORMATTING target_date: ${schedule.target_date}, tz: ${tz}, will be: ${schedule.target_date + tz * 1000}`);
   let max_date = new Date(schedule.max_date + tz * 1000);
   const replies = LoadReplies(language);

   let until = '';
   let period = '';
   if (max_date.getTime() >= Date.now()) {
      until = '\r\nдо <b>' + FormDateStringFormat(max_date, language) + '</b>';
   }
   if (!TimeListIsEmpty(parsedDate.period_time)) {
      period = `\r\n${replies.everyTime} <b>${FormPeriodStringFormat(parsedDate, language)}</b>`;
   }
   let username = '';
   if (schedule.username != 'none') {
      username = ` (<b>${schedule.username}</b>)`;
   }
   let divider = ' ';
   if(until != '' || period != '') {
      divider = '\r\n';
   }
   return `"${schedule.text}"${username}${divider}<b>${FormDateStringFormat(target_date, language)}</b>${until}${period}`;
}

module.exports = {
   TimeListIsEmpty,
   FormDateStringFormat,
   FormPeriodStringFormat,
   FormStringFormatSchedule
}