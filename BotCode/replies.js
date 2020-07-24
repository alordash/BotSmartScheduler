Replies = {
    welcome: `Welcome.
This is <b>Bot-Scheduler</b>. He can help you to schedule your tasks fast and accurate.
Just type your plans and he will automatically find scheduling date and what's to schedule ⏰
It is an open source project and is <a href="http://github.com/alordash/BotSmartScheduler">available here</a>.\r\n`,
    commands: `<b>Available commands:</b>
🗓 /list
        Shows active tasks for this chat.
🗑 /del <b>1, 2, ...N</b>
        Deletes tasks by id.
🗑 /del <b>1-10, A-B</b>
        Deletes all tasks within range.
#️⃣ /N
        Deletes N-th task.`,
    scheduled: function (text, myFormattedDate) {
        return `"${text}" already scheduled at: <b>${myFormattedDate}</b>\r\n`;
    },
    cleared: `Cleared all schedules.\r\nShow list: /list`,
    deleted: function (str, end, newline) {
        return `Deleted ${str} schedule${end}.${newline === false ? `\r\nShow list: /list` : ``}`;
    },
    listIsEmpty: `List of plans is empty.`,

    //#region TZ config
    tzWarning: `⚠️ Please select your time zone by typing <b>/tz</b>\r\n`,
    tzPrivateChat: `🛠 To configure time zone you can either:\r\n1. Let us know your location.\r\n2. Type UTC offset in <b>± HH</b>:<b>MM</b> format.`,
    tzGroupChat: `🛠 To configure time zone type UTC offset in <b>± HH</b>:<b>MM</b> format.`,
    tzUseLocation: `🔍 Use my location`,
    tzUseLocationResponse: `Configuring...`,
    tzTypeManually: `⌨️ Type manually`,
    tzTypeManuallyReponse: `Type your UTC offset in <b>± HH</b>:<b>MM</b> format.`,
    tzInvalidInput: `🚫 Please enter valid UTC offset in <b>± HH</b>:<b>MM</b> format,\r\nwhere ± — plus or minus, HH - hours, MM - minutes.`,
    tzDetermined: function (tz) {
        return `🌐 Your time zone: UTC <b>${tz}</b>.`;
    },
    tzCancel: `❌ Cancel`,
    tzCancelReponse: `⏳ Cancelled.`,
    tzCancelWarning: `❗️ Please note that defining time zone increases time accuracy.`
    //#endregion TZ config
}
module.exports = { Replies };