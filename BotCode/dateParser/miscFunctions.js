const { constants } = require('./constValues');
MiscFunctions = {
    timeSeparators: constants.timeSeparators,
    dateSeparator: constants.dateSeparator,

    IsSpecicalChar: function (c) {
        for (const separator of this.timeSeparators) {
            if (c == separator) {
                return true;
            }
        }
        for (const symbol of constants.specialSymbols) {
            if (c == symbol) {
                return true;
            }
        }
        if (c == this.dateSeparator) {
            return true;
        }
        return false;
    },

    IsLetter: function (c) {
        return c.toLowerCase() != c.toUpperCase();
    },

    GetCurrentTime: function (timeType, date) {
        if (timeType == 'years') {
            return date.getFullYear();
        } else if (timeType == 'months') {
            return date.getMonth();
        } else if (timeType == 'dates') {
            return date.getDate();
        } else if (timeType == 'hours') {
            return date.getHours();
        } else if (timeType == 'minutes') {
            return date.getMinutes();
        }
        return 0;
    },

    IsInteger: function (str) {
        var n = Number(str);
        return n !== Infinity && n >= 0 && n == Math.floor(n) && str.length;
    },

    TimeFoundInWord: function (timeType, wordIndex) {
        for (let i in this.time[timeType].values) {
            i = +i;
            let timeProperty = this.time[timeType].values[i];
            if (timeProperty.word === wordIndex) {
                return i;
            }
        }
        return -1;
    },
    GetPreviousTimeType: function (timeType) {
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
    },
    GetNextTimeType: function (timeType) {
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
    },

    GetTimeTillDayOfWeek: function (currentDay, day, numberOfWeaks) {
        let res = 7 * numberOfWeaks;
        if (currentDay < day) res += day - currentDay;
        else res += 7 - (currentDay - day);
        return res;
    },

    AddWordIndex: function (...indexes) {
        for (let index of indexes) {
            if (!this.usedWords.includes(index)) this.usedWords.push(index);
        }
    },

    FormDateStringFormat: function (date) {
        let month = date.getMonth();
        let hour = date.getHours().toString(10),
            minute = date.getMinutes().toString(10);
        if (hour.length <= 1) hour = '0' + hour;
        if (minute.length <= 1) minute = '0' + minute;
        let year = '';
        if (date.getFullYear() != new Date().getFullYear()) year = ` ${date.getFullYear()} г.`;
        return (`${date.getDate()} ${constants.monthsRusRoot[month]}${constants.monthsRusEnding[month][1]} ${hour}:${minute}${year}`);
    }
}

module.exports = { MiscFunctions };