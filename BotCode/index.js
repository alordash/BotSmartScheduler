const request = require('async-request');
const Markup = require('telegraf/markup');
const Extra = require('telegraf/extra');
let telegraf = require('telegraf');

let incomingMsgTimer = {};
let incomingMsgCtxs = {};
const DateParser = require('./dateParser/dateParser');
const { MiscFunctions } = require('./dateParser/miscFunctions');
const { Replies } = require('./Replies');
const rp = new Replies();
const debugWebServer = require('./debugWebServer');
let dWB = new debugWebServer();
const dbManagement = require('./scheduling/db');
let dbUrl;
if (process.env.IS_HEROKU) {
    dbUrl = new URL(process.env.DATABASE_URL);
} else {
    dbUrl = new URL(process.env.SMART_SCHEDULER_DB_URL);
}

const dbOptions = {
    user: dbUrl.username,
    host: dbUrl.hostname,
    database: dbUrl.pathname.substring(1),
    password: dbUrl.password,
    port: parseInt(dbUrl.port),
    ssl: {
        rejectUnauthorized: false
    }
}
let db = new dbManagement.dbManagment(dbOptions);

console.log(`process.env.IS_HEROKU = ${process.env.IS_HEROKU}`);

function GetDeletingIDsIndex(chatID, deletingIDs) {
    if (deletingIDs.length) {
        for (let i in deletingIDs) if (deletingIDs[i].chatID == chatID) return i;
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
async function LoadSchedulesList(chatID, tsOffset) {
    let schedules = await db.ListSchedules(chatID);
    if (schedules !== false) {
        let answer = ``;
        schedules.sort((a, b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0));
        for (let schedule of schedules) {
            let scheduledBy = '';
            if (schedule.username != 'none') scheduledBy = ` by <b>${schedule.username}</b>`;
            answer += `/${schedule.id}. "${schedule.text}"${scheduledBy}: <b>${MiscFunctions.FormDateStringFormat(new Date(+schedule.ts + tsOffset * 1000))}</b>\r\n`;
        }
        return answer;
    } else {
        return rp.listIsEmpty;
    }
}
async function StartTimeZoneDetermination(ctx) {
    let isPrivateChat = ctx.chat.id >= 0;
    if (isPrivateChat) {
        return ctx.replyWithHTML(rp.tzPrivateChat, Markup
            .keyboard([
                [{ text: rp.tzUseLocation, request_location: true }, { text: rp.tzTypeManually }],
                [{ text: rp.tzCancel }]
            ]).oneTime()
            .removeKeyboard()
            .resize()
            .extra()
        );
    }
    if (tzPendingConfirmationUsers.indexOf(ctx.from.id) < 0) tzPendingConfirmationUsers.push(ctx.from.id);
    return ctx.replyWithHTML(rp.tzGroupChat);
}
async function CheckExpiredSchedules() {
    console.log('Checking expired schedules ' + new Date());
    db.sending = true;
    let expiredSchedules = await db.CheckActiveSchedules(Date.now());
    if (expiredSchedules.length) {
        console.log(`expiredSchedules = ${JSON.stringify(expiredSchedules)}`);
        let ChatIDs = [];
        let deletingIDs = [];
        for (let schedule of expiredSchedules) {
            let chatID = schedule.chatid;
            if (chatID[0] == '_') chatID = '-' + chatID.substring(1, chatID.length);
            console.log(`Expired schedule = ${JSON.stringify(schedule)}`);
            if (!ChatIDs.includes(schedule.chatid)) ChatIDs.push(schedule.chatid);
            if (typeof (incomingMsgTimer[schedule.chatid]) != 'undefined') clearTimeout(incomingMsgTimer[schedule.chatid]);
            let mentionUser = '';
            if (schedule.username != 'none') mentionUser = ' @' + schedule.username;
            await bot.telegram.sendMessage(+chatID, `⏰${mentionUser} "${schedule.text}"`);

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
            if (typeof (ctxs) != 'undefined' && ctxs.length) await ServiceMsgs(incomingMsgCtxs[chatID]);
        }
        console.log(`Serviced incoming msgs`);
    }
    db.sending = false;
    console.log(`Done checking expired schedules`);
};

var bot = new telegraf(process.env.SMART_SCHEDULER_TLGRM_API_TOKEN);

(async function Init() {
    await db.InitDB();
    await dWB.dWBinit();
    await bot.launch();
    let ts = Date.now();
    setTimeout(async function () {
        console.log(`Timeout expired`);
        setInterval(CheckExpiredSchedules, 60000);
        await CheckExpiredSchedules();
    }, (Math.floor(ts / 60000) + 1) * 60000 - ts);
    if (process.env.IS_HEROKU == 'true') console.log = function () { };
})();

bot.start(ctx => {
    let options = rp.mainKeyboard;
    options['disable_web_page_preview'] = true;
    ctx.replyWithHTML(rp.welcome + rp.commands, options);
});
bot.help(ctx => ctx.replyWithHTML(rp.commands, rp.mainKeyboard));

var tzPendingConfirmationUsers = [];
bot.command('tz', async (ctx) => {
    await StartTimeZoneDetermination(ctx);
});

bot.hears(rp.tzUseLocation, ctx => {
    ctx.replyWithHTML(rp.tzUseLocationResponse);
});
bot.hears(rp.tzTypeManually, ctx => {
    if (tzPendingConfirmationUsers.indexOf(ctx.from.id) < 0) tzPendingConfirmationUsers.push(ctx.from.id);
    ctx.replyWithHTML(rp.tzTypeManuallyReponse);
});
bot.hears(rp.tzCancel, async ctx => {
    tzPendingConfirmationUsers.splice(tzPendingConfirmationUsers.indexOf(ctx.from.id), 1);
    let reply = rp.tzCancelReponse;
    if (!await db.HasUserID(ctx.from.id)) {
        reply += '\r\n' + rp.tzCancelWarning;
    }
    ctx.replyWithHTML(reply, rp.mainKeyboard);
});
bot.hears(rp.showListAction, async (ctx) => {
    let chatID = FormatChatId(ctx.chat.id);
    let tz = await db.GetUserTZ(ctx.from.id);
    return await ctx.replyWithHTML(await LoadSchedulesList(chatID, tz));
});

bot.hears(rp.changeTimeZoneAction, async (ctx) => {
    return await StartTimeZoneDetermination(ctx);
});

bot.action('tz cancel', async (ctx) => {
    await ctx.answerCbQuery();
    tzPendingConfirmationUsers.splice(tzPendingConfirmationUsers.indexOf(ctx.from.id), 1);
    let text = rp.tzCancelReponse;
    if (!await db.HasUserID(ctx.from.id)) {
        text += '\r\n' + rp.tzCancelWarning;
    }
    ctx.editMessageText('...');
    await ctx.replyWithHTML(text, rp.mainKeyboard);
    await ctx.deleteMessage();
});


bot.on('location', async ctx => {
    let location = ctx.message.location;
    try {
        let tz = await request(`http://api.geonames.org/timezoneJSON?lat=${location.latitude}&lng=${location.longitude}&username=alordash`);
        tz.body = JSON.parse(tz.body);
        console.log(`Received location: ${JSON.stringify(location)}`);
        console.log(`tz = ${JSON.stringify(tz)}`);
        let rawOffset = tz.body.rawOffset;
        let userId = ctx.from.id;
        let ts = rawOffset * 3600;
        if (await db.HasUserID(userId)) {
            await db.RemoveUserTZ(userId);
        }
        await db.AddUserTZ(userId, ts);
        ctx.replyWithHTML(rp.tzLocation(rawOffset), rp.mainKeyboard);
    } catch (e) {
        console.error(e);
    }
});

bot.on('text', async ctx => {
    let chatID = FormatChatId(ctx.chat.id)
    if (tzPendingConfirmationUsers.indexOf(ctx.from.id) >= 0) {
        let userId = ctx.from.id;
        let matches = ctx.message.text.match(/(\+|-|)([0-9])+:([0-9])+/g);
        if (matches != null) {
            //Parse tz from msg;
            let offset = matches[0];
            let index = offset.indexOf(':');
            let hours = parseInt(offset.substring(0, index));
            let minutes = parseInt(offset.substring(index + 1));
            let ts = hours * 3600;
            ts += minutes * 60 * (ts < 0 ? -1 : 1);
            console.log(`Determining tz: offset = ${offset}, hours = ${hours}, minutes = ${minutes}, ts = ${ts}`);
            if (await db.HasUserID(userId)) {
                await db.RemoveUserTZ(userId);
            }
            await db.AddUserTZ(userId, ts);
            tzPendingConfirmationUsers.splice(tzPendingConfirmationUsers.indexOf(ctx.from.id), 1);
            ctx.replyWithHTML(rp.tzDetermined(hours, minutes), rp.mainKeyboard);
        } else {
            console.log(`Can't determine tz in "${ctx.message.text}"`);
            return ctx.replyWithHTML(rp.tzInvalidInput, Extra.markup((m) =>
                m.inlineKeyboard([
                    m.callbackButton(rp.tzCancel, 'tz cancel')
                ]).oneTime()
            ));
        }
    } else {
        if (typeof (incomingMsgCtxs[chatID]) == 'undefined') incomingMsgCtxs[chatID] = [];
        incomingMsgCtxs[chatID].push(ctx);
        if (typeof (incomingMsgTimer[chatID]) != 'undefined') clearTimeout(incomingMsgTimer[chatID]);
        incomingMsgTimer[chatID] = setTimeout(() => {
            ServiceMsgs(incomingMsgCtxs[chatID]);
            incomingMsgCtxs[chatID] = [];
        }, 1000);
    }
    console.log(`Received msg`);
    /*
        if (!db.sending) await ServiceMsg(ctx);
        else db.waitingForServiceMsgs.push({ func: ServiceMsg, ctx: ctx });*/
});

async function ServiceMsgs(ctxs) {
    let servicedMessages = [];
    let deletingSchedulesIDs = [];
    let chatID = ctxs[0].chat.id.toString();
    if (chatID[0] == '-') {
        chatID = '_' + chatID.substring(1, chatID.length);
    }
    let deleteAll = false;
    for (let ctx of ctxs) {
        dWB.msgData = ctx.message;
        let msgText = ctx.message.text;

        if (msgText[0] == '/') {
            let serviceRes = await ServiceCommand(ctx);
            if (typeof (serviceRes) != 'undefined') {
                if (serviceRes[0] == 'all' || deleteAll) {
                    deletingSchedulesIDs = ['all'];
                    deleteAll = true;
                } else {
                    deletingSchedulesIDs = deletingSchedulesIDs.concat(serviceRes);
                }
            }
        } else if (msgText[0] == '.') {
            let res = await db.Query(msgText.substring(1, msgText.length));
            await ctx.reply(`Postgres response: ${JSON.stringify(res.rows)}`);
        } else {
            let tz = await db.GetUserTZ(ctx.from.id);
            let parsedMessage = await DateParser.ParseDate(msgText, tz, process.env.IS_HEROKU != 'true');
            servicedMessages.push({ parsedMessage: parsedMessage, chatID: chatID, username: ctx.from.username, userID: ctx.from.id });
        }
    }
    let reply = '';
    let schedules = [];
    for (let servicedMessage of servicedMessages) {
        let isScheduled = await db.GetScheduleByText(servicedMessage.chatID, servicedMessage.parsedMessage.text);
        let tz = await db.GetUserTZ(servicedMessage.userID);
        if (isScheduled !== false) {
            isScheduled = +isScheduled;
            reply += rp.scheduled(servicedMessage.parsedMessage.text, MiscFunctions.FormDateStringFormat(new Date(isScheduled + tz * 1000)));
        } else {
            if (typeof (servicedMessage.parsedMessage.date) != 'undefined') {
                schedules.push({ chatID: servicedMessage.chatID, text: servicedMessage.parsedMessage.text, timestamp: servicedMessage.parsedMessage.date.getTime(), username: servicedMessage.username });
                reply += servicedMessage.parsedMessage.answer + `\r\n`;
            } else {
                if (servicedMessage.chatID[0] !== '_') reply += servicedMessage.parsedMessage.answer + `\r\n`;
            }
            if (servicedMessage.chatID[0] !== '_' && !(await db.HasUserID(servicedMessage.userID))) {
                reply += rp.tzWarning;
            }
        }
    }
    if (deletingSchedulesIDs.length) {
        if (deleteAll) {
            await db.ClearAllSchedules(chatID);
            reply += rp.cleared;
        } else {
            let s = '';
            for (let i in deletingSchedulesIDs) {
                let schedule = deletingSchedulesIDs[i];
                if (!isNaN(schedule)) s += `id = ${schedule} OR `;
                else deletingSchedulesIDs.splice(i, 1);
            }
            s = s.substring(0, s.length - 4);
            await db.RemoveSchedules(chatID, s)
            await db.ReorderSchedules(chatID);
            let end = '';
            if (deletingSchedulesIDs.length > 1) end = 's';

            reply += rp.deleted(deletingSchedulesIDs.join(', '), end, reply.length > 0);
        }
    }
    if (schedules.length) await db.AddNewSchedules(schedules);
    if (reply.length) await ctxs[0].replyWithHTML(reply);
}

async function ServiceCommand(ctx) {
    let chatID = FormatChatId(ctx.chat.id)
    let msgText = ctx.message.text
    if (msgText.indexOf('/list') == 0) {
        let tz = await db.GetUserTZ(ctx.from.id);
        await ctx.replyWithHTML(await LoadSchedulesList(chatID, tz));
    } else if (msgText.indexOf('/del') == 0) {
        if (msgText.indexOf('all') > -1) {
            return ['all'];
        } else {
            let nums = msgText.match(/[0-9]+/g);
            let ranges = msgText.match(/[0-9]+-[0-9]+/g);
            for (let i in nums) {
                nums[i] = parseInt(nums[i], 10);
            }
            let count = 0;
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
            nums = nums.filter((item, pos) => {
                return nums.indexOf(item) == pos;
            });
            nums.sort((a, b) => a - b);
            if (!isNaN(nums[0])) {
                return nums;
            }
        }
    } else if (MiscFunctions.IsInteger(msgText[1])) {
        return [parseInt(msgText.substring(1, msgText.length))];
    }
    console.log(`Serviced Command`);
}