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
    tzWarning: `⚠️ Please select your time zone by typing <b>/tz</b>`,
    cleared: `Cleared all schedules.\r\nShow list: /list`,
    deleted: function (str, end, newline) {
        return `Deleted ${str} schedule${end}.${newline === false ? `\r\nShow list: /list` : ``}`;
    },
    listIsEmpty: `List of plans is empty.`
}
module.exports = { Replies };