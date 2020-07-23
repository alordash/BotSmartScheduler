const Markup = require('telegraf/markup')
let telegraf = require('telegraf');

let incomingMsgTimer = {};
let incomingMsgCtxs = {};
const DateParser = require('./dateParser/dateParser');
const { MiscFunctions } = require('./dateParser/miscFunctions');
const { Replies } = require('./replies');
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
bot.start(ctx => ctx.replyWithHTML(Replies.welcome + Replies.commands,
    { disable_web_page_preview: true }));
bot.help(ctx => ctx.replyWithHTML(Replies.commands));

bot.on('text', async ctx => {
    let chatID = ctx.chat.id.toString(10);
    if (chatID[0] == '-') {
        chatID = '_' + chatID.substring(1, chatID.length);
    }
    if (typeof (incomingMsgCtxs[chatID]) == 'undefined') incomingMsgCtxs[chatID] = [];
    incomingMsgCtxs[chatID].push(ctx);
    if (typeof (incomingMsgTimer[chatID]) != 'undefined') clearTimeout(incomingMsgTimer[chatID]);
    incomingMsgTimer[chatID] = setTimeout(() => {
        ServiceMsgs(incomingMsgCtxs[chatID]);
        incomingMsgCtxs[chatID] = [];
    }, 1000);
    console.log(`Received msg`);
    /*
        if (!db.sending) await ServiceMsg(ctx);
        else db.waitingForServiceMsgs.push({ func: ServiceMsg, ctx: ctx });*/
});

async function ServiceMsgs(ctxs) {
    let servicedMessages = [];
    let deletingSchedulesIDs = [];
    let chatID = ctxs[0].chat.id.toString(10);
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
            let parsedMessage = await DateParser.ParseDate(msgText, process.env.IS_HEROKU != 'true');
            servicedMessages.push({ parsedMessage: parsedMessage, chatID: chatID, username: ctx.from.username, userID: ctx.from.id });
        }
    }
    let reply = '';
    let schedules = [];
    for (let servicedMessage of servicedMessages) {
        let isScheduled = await db.GetScheduleByText(servicedMessage.chatID, servicedMessage.parsedMessage.text);
        if (isScheduled !== false) {
            isScheduled = +isScheduled;
            reply += Replies.scheduled(servicedMessage.parsedMessage.text, MiscFunctions.FormDateStringFormat(new Date(isScheduled)));
        } else {
            if (typeof (servicedMessage.parsedMessage.date) != 'undefined') {
                schedules.push({ chatID: servicedMessage.chatID, text: servicedMessage.parsedMessage.text, timestamp: servicedMessage.parsedMessage.date.getTime(), username: servicedMessage.username });
                reply += servicedMessage.parsedMessage.answer + `\r\n`;
            } else {
                if (servicedMessage.chatID[0] !== '_') reply += servicedMessage.parsedMessage.answer + `\r\n`;
            }
            if (!(await db.HasUserID(servicedMessage.userID))) {
                reply += Replies.tzWarning;
            }
        }
    }
    if (deletingSchedulesIDs.length) {
        if (deleteAll) {
            await db.ClearAllSchedules(chatID);
            reply += Replies.cleared;
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

            reply + Replies.deleted(deletingSchedulesIDs.join(', '), end, reply.length > 0);
        }
    }
    if (schedules.length) await db.AddNewSchedules(schedules);
    if (reply.length) await ctxs[0].replyWithHTML(reply);
}

async function ServiceCommand(ctx) {
    let chatID = ctx.chat.id.toString(10);
    if (chatID[0] == '-') {
        chatID = '_' + chatID.substring(1, chatID.length);
    }
    let msgText = ctx.message.text
    if (msgText.indexOf('/list') == 0) {
        let schedules = await db.ListSchedules(chatID);
        if (schedules !== false) {
            let answer = ``;
            schedules.sort((a, b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0));
            for (let schedule of schedules) {
                let scheduledBy = '';
                if (schedule.username != 'none') scheduledBy = ` by <b>${schedule.username}</b>`;
                answer += `/${schedule.id}. "${schedule.text}"${scheduledBy}: <b>${MiscFunctions.FormDateStringFormat(new Date(+schedule.ts))}</b>\r\n`;
            }
            await ctx.replyWithHTML(answer);
        } else {
            await ctx.reply(Replies.listIsEmpty);
        }
    } else if (msgText.indexOf('/del') == 0) {
        if (msgText.indexOf('all') > -1) {
            return ['all'];
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
                for (let j = leftNum; j <= rightNum; j++) {
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