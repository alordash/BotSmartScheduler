const constants = require('./constValues');

exports.IsSpecicalChar = function (c) {
   for (const separator of constants.timeSeparators) {
      if (c == separator) {
         return true;
      }
   }
   for (const symbol of constants.specialSymbols) {
      if (c == symbol) {
         return true;
      }
   }
   if (c == constants.dateSeparator) {
      return true;
   }
   return false;
}

exports.IsLetter = function (c) {
   return c.toLowerCase() != c.toUpperCase();
}

exports.GetCurrentTime = function (timeType, date) {
   switch (timeType) {
      case 'years':
         return date.getFullYear();
      case 'months':
         return date.getMonth() + 1;
      case 'dates':
         return date.getDate();
      case 'hours':
         return date.getHours();
      case 'minutes':
         return date.getMinutes();
      default:
         return 0;
   }
}

exports.IsInteger = function (str) {
   var n = Number(str);
   return n !== Infinity && n >= 0 && n == Math.floor(n) && str.length;
}

exports.TimeFoundInWord = function (timeType, wordIndex) {
   for (let i in this.time[timeType].values) {
      i = +i;
      let timeProperty = this.time[timeType].values[i];
      if (timeProperty.word === wordIndex) {
         return i;
      }
   }
   return -1;
}
exports.GetPreviousTimeType = function (timeType) {
   switch (timeType) {
      case 'years':
         return 'months';
      case 'months':
         return 'dates';
      case 'dates':
         return 'hours';
      case 'hours':
         return 'minutes';
      case 'minutes':
         return 'years';
   }
}
exports.GetNextTimeType = function (timeType) {
   switch (timeType) {
      case 'years':
         return 'minutes';
      case 'months':
         return 'years';
      case 'dates':
         return 'months';
      case 'hours':
         return 'dates';
      case 'minutes':
         return 'hours';
   }
}

exports.GetTimeTillDayOfWeek = function (currentDay, day, numberOfWeeks) {
   let res = 7 * numberOfWeeks;
   if (currentDay < day) {
      res += day - currentDay;
   } else {
      res += 7 - (currentDay - day);
   }
   return res;
}

exports.AddWordIndex = function (...indexes) {
   for (let index of indexes) {
      if (!this.usedWords.includes(index)) {
         this.usedWords.push(index);
      }
   }
}

exports.FormDateStringFormat = function (date) {
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
   return (`${date.getDate()} ${constants.monthsRusRoot[month]}${constants.monthsRusEnding[month][1]} ${hour}:${minute}${year}`);
}