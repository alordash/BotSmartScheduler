const { ParsedDate } = require('@alordash/date-parser');
const { Schedule } = require('../../backend/dataBase/db');

/**
 * @param {TimeList} timeList 
 * @returns {Boolean} 
 */
function TimeListIsEmpty(timeList) {
   return typeof (timeList.years) == 'undefined'
      && typeof (timeList.months) == 'undefined'
      && typeof (timeList.dates) == 'undefined'
      && typeof (timeList.hours) == 'undefined'
      && typeof (timeList.minutes) == 'undefined';
}

/**@param {Date} date 
 * @returns {String} 
 */
function FormDateStringFormat(date) {
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
   return `${date.getDate()} ${/*constants.monthsRusRoot[month]*/'month'}${/*constants.monthsRusEnding[month][1]*/'month'} ${hour}:${minute}${year}`;
}

/**@param {ParsedDate} parsedDate 
 * @returns {String} 
 */
function FormPeriodStringFormat(parsedDate) {
    let result = '';
    for (const timeType in parsedDate.period_time) {
        if (typeof (parsedDate.period_time[timeType]) != 'undefined' && timeType != 'isOffset') {
            result = parsedDate.period_time[timeType] + ' ' + timeType + ' ' + result;
        }
    }
    return result.trim();
}

/**@param {Schedule} schedule
 * @param {ParsedDate} parsedDate 
 * @returns {String}
 */
function FormStringFormatSchedule(schedule, parsedDate) {
    let target_date = new Date(schedule.target_date);
    let max_date = new Date(schedule.max_date);

    let until = '';
    let period = '';
    if (max_date.getTime() >= Date.now()) {
        until = '\r\nдо <b>' + FormDateStringFormat(max_date) + '</b>';
    }
    if (!TimeListIsEmpty(parsedDate.period_time)) {
        period = '\r\nкаждые <b>' + FormPeriodStringFormat(parsedDate) + '</b>';
    }
    return `"${schedule.text}" <b>${FormDateStringFormat(target_date)}</b>${until}${period}`;
}

module.exports = {
    TimeListIsEmpty,
    FormDateStringFormat,
    FormPeriodStringFormat,
    FormStringFormatSchedule
}