const Markup = require('telegraf/markup');
const Extra = require('telegraf/extra');
const DateParser = require('../../backend/dateParser/dateParser');
const MiscFunctions = require('../../backend/dateParser/miscFunctions');
const rp = require('../replies/replies');

//#region functions
function GetDeletingIDsIndex(chatID, deletingIDs) {
    if (deletingIDs.length) {
        for (let i in deletingIDs) {
            if (deletingIDs[i].chatID == chatID) {
                return i;
            }
        }
    }
    return false;
}
function FormatChatId(id) {
    id = id.toString(10);
    if (id[0] == '-') {
        id = '_' + id.substring(1);
    }
    return id;
}
async function LoadSchedulesList(chatID, tsOffset, db) {
    let schedules = await db.ListSchedules(chatID);
    if (schedules !== false) {
        let answer = ``;
        schedules.sort((a, b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0));
        for (let schedule of schedules) {
            let scheduledBy = '';
            if (schedule.username != 'none') {
                scheduledBy = ` by <b>${schedule.username}</b>`;
            }
            answer += `/${schedule.id}. "${schedule.text}"${scheduledBy}: <b>${MiscFunctions.FormDateStringFormat(new Date(+schedule.ts + tsOffset * 1000))}</b>\r\n`;
        }
        return answer;
    } else {
        return rp.listIsEmpty;
    }
}

async function DeleteSchedules(ctx, db) {
    let chatID = FormatChatId(ctx.chat.id)
    let msgText = ctx.message.text;
    if (msgText.indexOf('all') == "/del ".length) {
        await db.ClearAllSchedules(chatID);
        await ctx.replyWithHTML(rp.cleared);
    } else {
        let nums = msgText.match(/[0-9]+/g);
        let ranges = msgText.match(/[0-9]+-[0-9]+/g);
        for (let i in nums) {
            nums[i] = parseInt(nums[i], 10);
        }
        for (let i in ranges) {
            let range = ranges[i];
            let index = range.indexOf('-');
            let leftNum = +range.substring(0, index);
            let rightNum = +range.substring(index + 1);
            if (leftNum > rightNum) {
                let t = leftNum;
                leftNum = rightNum;
                rightNum = t;
            }
            for (let j = leftNum; j <= rightNum && j - leftNum <= 10; j++) {
                nums.push(j);
            }
        }
        if (nums != null) {
            nums = nums.filter((item, pos) => {
                return nums.indexOf(item) == pos;
            });
            nums.sort((a, b) => a - b);

            let query = '';
            for (let i in nums) {
                let schedule = nums[i];
                query += `id = ${schedule} OR `;
            }
            query = query.substring(0, query.length - 4);
            await db.RemoveSchedules(chatID, query);
            await db.ReorderSchedules(chatID);
            let end = '';
            if (nums.length > 1) {
                end = 's';
            }
            try {
                ctx.replyWithHTML(rp.deleted(nums.join(', '), end, false));
            } catch (e) {
                console.error(e);
            }
        } else {
            try {
                ctx.replyWithHTML(rp.notDeleted);
            } catch (e) {
                console.error(e);
            }
        }
    }
}

async function StartTimeZoneDetermination(ctx, db, tzPendingConfirmationUsers) {
    let curTZ = await db.GetUserTZ(ctx.from.id);
    let reply = '';
    if (curTZ !== 0) {
        reply = rp.tzCurrent(curTZ) + '\r\n';
    }
    let isPrivateChat = ctx.chat.id >= 0;
    if (isPrivateChat) {
        reply += rp.tzPrivateChat;
        try {
            return ctx.replyWithHTML(reply, Markup
                .keyboard([
                    [{ text: rp.tzUseLocation, request_location: true }, { text: rp.tzTypeManually }],
                    [{ text: rp.tzCancel }]
                ]).oneTime()
                .removeKeyboard()
                .resize()
                .extra()
            );
        } catch (e) {
            console.error(e);
        }
    }
    reply += rp.tzGroupChat;
    if (tzPendingConfirmationUsers.indexOf(ctx.from.id) < 0) {
        tzPendingConfirmationUsers.push(ctx.from.id);
    }
    try {
        return await ctx.replyWithHTML(rp.tzGroupChat);
    } catch (e) {
        console.error(e);
    }
}

async function CheckExpiredSchedules(bot, db) {
    console.log('Checking expired schedules ' + new Date());
    db.sending = true;
    let expiredSchedules = await db.CheckActiveSchedules(Date.now());
    if (expiredSchedules.length) {
        console.log(`expiredSchedules = ${JSON.stringify(expiredSchedules)}`);
        let ChatIDs = [];
        let deletingIDs = [];
        for (let schedule of expiredSchedules) {
            let chatID = schedule.chatid;
            if (chatID[0] == '_') {
                chatID = '-' + chatID.substring(1, chatID.length);
            }
            console.log(`Expired schedule = ${JSON.stringify(schedule)}`);
            if (!ChatIDs.includes(schedule.chatid)) {
                ChatIDs.push(schedule.chatid);
            }
            let mentionUser = '';
            if (schedule.username != 'none') {
                mentionUser = ' @' + schedule.username;
            }
            try {
                let msg = await bot.telegram.sendMessage(+chatID, `⏰${mentionUser} "${schedule.text}"`, Extra.markup((m) =>
                    m.inlineKeyboard([
                        m.callbackButton(rp.repeatSchedule, 'repeat')
                    ]).oneTime()
                ));
                setTimeout(function (msg) {
                    bot.telegram.editMessageReplyMarkup(msg.chat.id, msg.message_id, Extra.markup((m) =>
                        m.inlineKeyboard([]).removeKeyboard()
                    ));
                }, repeatScheduleTime, msg);
            } catch (e) {
                console.error(e);
            }

            let index = GetDeletingIDsIndex(schedule.chatid, deletingIDs);
            if (index === false) {
                deletingIDs.push({ s: `id = ${schedule.id} OR `, chatID: schedule.chatid });
            } else {
                deletingIDs[index].s += `id = ${schedule.id} OR `;
            }
        }
        console.log('CHECKED, removing and reordering');
        for (let chatID of ChatIDs) {
            let index = GetDeletingIDsIndex(chatID, deletingIDs);
            if (index !== false) {
                let s = deletingIDs[index].s;
                s = s.substring(0, s.length - 4);
                await db.RemoveSchedules(chatID, s);
            }
            await db.ReorderSchedules(chatID);
        }
        console.log('Removed and reordered, Servicing incoming msgs');
        for (let chatID of ChatIDs) {
            let ctxs = incomingMsgCtxs[chatID];
            if (typeof (ctxs) != 'undefined' && ctxs.length) {
                await ServiceMsgs(incomingMsgCtxs[chatID], db);
            }
        }
        console.log(`Serviced incoming msgs`);
    }
    db.sending = false;
    console.log(`Done checking expired schedules`);
}

async function ConfrimTimeZone(ctx, db, tzPendingConfirmationUsers) {
    let userId = ctx.from.id;
    let matches = ctx.message.text.match(/(\+|-|–|—|)([0-9])+:([0-9])+/g);
    let hours, minutes, negative, ts;
    if (matches != null) {
        //Parse tz from msg;
        let offset = matches[0];
        let index = offset.indexOf(':');
        hours = parseInt(offset.substring(0, index));
        negative = offset[0].match(/-|–|—/g) != null;
        minutes = parseInt(offset.substring(index + 1));
        console.log(`Determining tz: offset = ${offset}, hours = ${hours}, minutes = ${minutes}, ts = ${ts}`);
    } else {
        matches = ctx.message.text.match(/(\+|-|–|—|)([0-9])+/g);
        if (matches != null) {
            let offset = matches[0];
            hours = parseInt(offset);
            minutes = 0;
            negative = offset[0].match(/-|–|—/g) != null;
            console.log(`Determining tz from only hour option: offset = ${offset}, hours = ${hours}, minutes = ${minutes}, ts = ${ts}`);
        }
    }
    if (matches != null) {
        let ts = hours * 3600;
        ts += minutes * 60 * (negative ? -1 : 1);
        if (await db.HasUserID(userId)) {
            await db.RemoveUserTZ(userId);
        }
        await db.AddUserTZ(userId, ts);
        tzPendingConfirmationUsers.splice(tzPendingConfirmationUsers.indexOf(ctx.from.id), 1);
        try {
            ctx.replyWithHTML(rp.tzCurrent(ts), rp.mainKeyboard);
        } catch (e) {
            console.error(e);
        }
    } else {
        console.log(`Can't determine tz in "${ctx.message.text}"`);
        try {
            return ctx.replyWithHTML(rp.tzInvalidInput, Extra.markup((m) =>
                m.inlineKeyboard([
                    m.callbackButton(rp.tzCancel, 'tz cancel')
                ]).oneTime()
            ));
        } catch (e) {
            console.error(e);
        }
    }
}

async function HandleTextMessage(ctx, db, tzPendingConfirmationUsers) {
    let chatID = FormatChatId(ctx.chat.id)
    if (tzPendingConfirmationUsers.indexOf(ctx.from.id) >= 0) {
        ConfrimTimeZone(ctx, db, tzPendingConfirmationUsers);
    } else {
        let reply = '';
        let msgText = ctx.message.text;
        if (msgText[0] == '/') {
            //#region DELETE CLICKED TASK 
            let scheduleId = parseInt(msgText.substring(1, msgText.length));
            if (!isNaN(scheduleId)) {
                await db.RemoveScheduleById(chatID, scheduleId);
                await db.ReorderSchedules(chatID);
                try {
                    ctx.replyWithHTML(rp.deleted(scheduleId.toString(10), '', false));
                } catch (e) {
                    console.error(e);
                }
            }
            //#endregion
        } else {
            //#region PARSE SCHEDULE
            let tz = await db.GetUserTZ(ctx.from.id);
            let parsedMessage = await DateParser.ParseDate(msgText, tz, process.env.ENABLE_LOGS);

            let isScheduled = await db.GetScheduleByText(chatID, parsedMessage.text);

            let schedulesCount = (await db.GetSchedules(chatID)).length;
            if (typeof (schedulesCount) == 'undefined') {
                schedulesCount = 0;
            }
            console.log(`schedulesCount = ${schedulesCount}`);
            let count = 0
            if (isScheduled !== false) {
                isScheduled = +isScheduled;
                reply += rp.scheduled(parsedMessage.text, MiscFunctions.FormDateStringFormat(new Date(isScheduled + tz * 1000)));
            } else {
                if (count + schedulesCount < global.MaximumCountOfSchedules) {
                    if (typeof (parsedMessage.date) != 'undefined') {
                        let username = 'none';
                        if (chatID[0] == '_') {
                            username = ctx.from.username;
                        }
                        await db.AddNewSchedule(chatID, parsedMessage.text, parsedMessage.date.getTime(), username);
                        reply += parsedMessage.answer + `\r\n`;
                        count++;
                    } else {
                        if (chatID[0] !== '_') {
                            reply += parsedMessage.answer + `\r\n`;
                        }
                    }
                    if (chatID[0] !== '_' && !(await db.HasUserID(ctx.from.id))) {
                        reply += rp.tzWarning;
                    }
                } else {
                    reply += rp.exceededLimit(global.MaximumCountOfSchedules);
                }
            }
            //#endregion
            try {
                ctx.replyWithHTML(reply);
            } catch (e) {
                console.error(e);
            }
        }
    }
}
//#endregion

module.exports = {
    GetDeletingIDsIndex,
    FormatChatId,
    LoadSchedulesList,
    DeleteSchedules,
    StartTimeZoneDetermination,
    CheckExpiredSchedules,
    HandleTextMessage
}