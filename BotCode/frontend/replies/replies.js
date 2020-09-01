const Markup = require('telegraf/markup');

exports.welcome = `Welcome.
This is <b>Bot-Scheduler</b>. He can help you to schedule your tasks fast and accurate.
Just type your plans and he will automatically find scheduling date and what's to schedule ⏰
This bot also can recognize voice messages 🎤
It is an open source project and is <a href="http://github.com/alordash/BotSmartScheduler">available here</a>.\r\n`;
exports.commands = `<b>Available commands:</b>
🗓 /list
        Shows active tasks for this chat.
🗑 /del <b>1, 2, ...N</b>
        Deletes tasks by id.
🗑 /del <b>1-10, A-B</b>
        Deletes all tasks within range.
#️⃣ /N
        Deletes N-th task.
🌐 /tz
        Configures time zone.
🎛 /kb
        Open menu.`;
exports.voiceMessageTooBig = `⚠️ Voice message duration should be less than 30 seconds.`;
exports.showListAction = `🗓 Show list`;
exports.changeTimeZoneAction = `🌐 Change time zone`;
exports.mainKeyboard = Markup.keyboard([
   [{ text: exports.showListAction }, { text: exports.changeTimeZoneAction }]
]).oneTime().removeKeyboard().resize().extra();
exports.scheduled = function (text, myFormattedDate) {
   return `"${text}" already scheduled at: <b>${myFormattedDate}</b>\r\n`;
}
exports.cleared = `Cleared all schedules.\r\nShow list: /list`;
exports.deleted = function (str, end, newline) {
   return `Deleted ${str} schedule${end}.${newline === false ? `\r\nShow list: /list` : ``}`;
}
exports.notDeleted = `Invalid use of command.`;
exports.listIsEmpty = `List of plans is empty.`;
exports.exceededLimit = function (maximum) {
   return `⚠️ Please remove some of your schedules.
Maximum count of schedules: <b>${maximum}</b>`;
}
exports.showKeyboard = `Opened menu.`;
exports.repeatSchedule = `🔔 Remind in 5 minutes`;
exports.remindSchedule = `🔔 Remind set to `;
exports.confirmSchedule = `Confirm ✅`;
exports.declineSchedule = `Decline ⛔️`;

//#region TZ config
exports.tzWarning = `⚠️ Please select your time zone by typing <b>/tz</b>\r\n`;
exports.tzPrivateChat = `🛠 To configure time zone you can either:\r\n1. Let us know your location.\r\n2. Type GMT offset in <b>±HH</b>:<b>MM</b> format.`;
exports.tzGroupChat = `🛠 To configure time zone type GMT offset in <b>±HH</b>:<b>MM</b> format.`;
exports.tzUseLocation = `🔍 Use my location`;
exports.tzUseLocationResponse = `Configuring...`;
exports.tzTypeManually = `⌨️ Type manually`;
exports.tzTypeManuallyReponse = `Type your GMT offset in <b>±HH</b>:<b>MM</b> format.`;
exports.tzInvalidInput = `🚫 Please enter valid GMT offset in <b>±HH</b>:<b>MM</b> format,\r\nwhere ± — plus or minus, HH - hours, MM - minutes.`;
exports.tzDetermined = function (hours, minutes, isNegative) {
   let s = '+'
   let t = '';
   if (isNegative) {
      s = '-';
      hours *= -1;
   }
   if (hours < 10)
      t = '0';
   s += t + hours + ':';
   if (minutes >= 10) t = '';
   s += t + minutes;
   return `🌐 Your time zone: GMT <b>${s}</b>.`;
}
exports.tzCancel = `❌ Cancel`;
exports.tzCancelReponse = `🚫 Cancelled.`;
exports.tzCancelWarning = `❗️ Please note that defining time zone increases time accuracy.`;
exports.tzLocation = function (tz) {
   let t = '';
   if (Math.abs(tz) < 10) t = '0';
   if (tz < 0) {
      t = '-' + t;
      tz *= -1;
   }
   else t = '+' + t;
   return `🌐 Your time zone: GMT <b>${t}${tz}:00</b>.`
}
exports.tzCurrent = function (tz) {
   let negative = tz < 0;
   let hour = tz / 3600 | 0;
   let minutes = Math.abs(tz % 3600 / 60);
   return exports.tzDetermined(hour, minutes, negative);
}
//#endregion TZ config

//module.exports = { rp };