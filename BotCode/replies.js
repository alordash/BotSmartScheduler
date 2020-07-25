const Markup = require('telegraf/markup');

class Replies {
    constructor() {
        this.welcome = `Welcome.
This is <b>Bot-Scheduler</b>. He can help you to schedule your tasks fast and accurate.
Just type your plans and he will automatically find scheduling date and what's to schedule ⏰
It is an open source project and is <a href="http://github.com/alordash/BotSmartScheduler">available here</a>.\r\n`;
        this.commands = `<b>Available commands:</b>
🗓 /list
        Shows active tasks for this chat.
🗑 /del <b>1, 2, ...N</b>
        Deletes tasks by id.
🗑 /del <b>1-10, A-B</b>
        Deletes all tasks within range.
#️⃣ /N
        Deletes N-th task.`;
        this.showListAction = `🗓 Show list`;
        this.changeTimeZoneAction = `🌐 Change time zone`;
        this.mainKeyboard = Markup.keyboard([
            [{ text: this.showListAction }, { text: this.changeTimeZoneAction }]
        ]).oneTime().removeKeyboard().resize().extra();
        this.scheduled = function (text, myFormattedDate) {
            return `"${text}" already scheduled at: <b>${myFormattedDate}</b>\r\n`;
        };
        this.cleared = `Cleared all schedules.\r\nShow list: /list`;
        this.deleted = function (str, end, newline) {
            return `Deleted ${str} schedule${end}.${newline === false ? `\r\nShow list: /list` : ``}`;
        };
        this.listIsEmpty = `List of plans is empty.`;

        //#region TZ config
        this.tzWarning = `⚠️ Please select your time zone by typing <b>/tz</b>\r\n`;
        this.tzPrivateChat = `🛠 To configure time zone you can either:\r\n1. Let us know your location.\r\n2. Type GMT offset in <b>± HH</b>:<b>MM</b> format.`;
        this.tzGroupChat = `🛠 To configure time zone type GMT offset in <b>± HH</b>:<b>MM</b> format.`;
        this.tzUseLocation = `🔍 Use my location`;
        this.tzUseLocationResponse = `Configuring...`;
        this.tzTypeManually = `⌨️ Type manually`;
        this.tzTypeManuallyReponse = `Type your GMT offset in <b>± HH</b>:<b>MM</b> format.`;
        this.tzInvalidInput = `🚫 Please enter valid GMT offset in <b>± HH</b>:<b>MM</b> format,\r\nwhere ± — plus or minus, HH - hours, MM - minutes.`;
        this.tzDetermined = function (hours, minutes) {
            let s = '+'
            let t = '';
            if (hours < 0) {
                s = '-';
                hours *= -1;
            }
            if (hours < 10)
                t = '0';
            s += t + hours + ':';
            if (minutes >= 10) t = '';
            s += t + minutes;
            return `🌐 Your time zone: GMT <b>${s}</b>.`;
        };
        this.tzCancel = `❌ Cancel`;
        this.tzCancelReponse = `🚫 Cancelled.`;
        this.tzCancelWarning = `❗️ Please note that defining time zone increases time accuracy.`;
        this.tzLocation = function (tz) {
            let t = '';
            if (tz * tz < 100) t = '0';
            if (tz < 0) {
                t = '-' + t;
                tz *= -1;
            }
            else t = '+' + t;
            return `🌐 Your time zone: GMT <b>${t}${tz}:00</b>.`
        }
        this.tzCurrent = function(tz) {
            let hour = tz / 3600 | 0;
            let minutes = tz % 3600 / 60;
            return this.tzDetermined(hour, minutes);
        }
        //#endregion TZ config
    }
}
module.exports = { Replies };