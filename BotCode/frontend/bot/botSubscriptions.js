const request = require('request-promise');
const rp = require('../replies/replies');
const botActions = require('./botActions');
const MiscFunctions = require('../../backend/dateParser/miscFunctions');
const { speechToText } = require('../../backend/stt/stt');
const stt = new speechToText(process.env.YC_API_KEY, process.env.YC_FOLDER_ID);

const MaximumVoiceMessageDuration = 30;
const repeatScheduleTime = 5 * 60 * 1000;

let tzPendingConfirmationUsers = [];

exports.InitActions = function (bot, db) {
    bot.start(ctx => {
        let options = rp.mainKeyboard;
        options['disable_web_page_preview'] = true;
        try {
            ctx.replyWithHTML(rp.welcome + rp.commands, options);
        } catch (e) {
            console.error(e);
        }
    });
    bot.help(ctx => {
        try {
            ctx.replyWithHTML(rp.commands, rp.mainKeyboard);
        } catch (e) {
            console.error(e);
        }
    });

    bot.command('tz', async ctx => {
        try {
            await botActions.StartTimeZoneDetermination(ctx, db, tzPendingConfirmationUsers);
        } catch (e) {
            console.error(e);
        }
    });
    bot.command('kb', async ctx => {
        try {
            ctx.replyWithHTML(rp.showKeyboard, rp.mainKeyboard);
        } catch (e) {
            console.error(e);
        }
    });

    bot.hears(rp.tzUseLocation, ctx => {
        try {
            ctx.replyWithHTML(rp.tzUseLocationResponse);
        } catch (e) {
            console.error(e);
        }
    });
    bot.hears(rp.tzTypeManually, ctx => {
        if (tzPendingConfirmationUsers.indexOf(ctx.from.id) < 0) {
            tzPendingConfirmationUsers.push(ctx.from.id);
        }
        try {
            ctx.replyWithHTML(rp.tzTypeManuallyReponse);
        } catch (e) {
            console.error(e);
        }
    });
    bot.hears(rp.tzCancel, async ctx => {
        tzPendingConfirmationUsers.splice(tzPendingConfirmationUsers.indexOf(ctx.from.id), 1);
        let reply = rp.tzCancelReponse;
        if (!await db.HasUserID(ctx.from.id)) {
            reply += '\r\n' + rp.tzCancelWarning;
        }
        try {
            ctx.replyWithHTML(reply, rp.mainKeyboard);
        } catch (e) {
            console.error(e);
        }
    });
    bot.hears(rp.showListAction, async ctx => {
        let chatID = botActions.FormatChatId(ctx.chat.id);
        let tz = await db.GetUserTZ(ctx.from.id);
        try {
            return await ctx.replyWithHTML(await botActions.LoadSchedulesList(chatID, tz, db));
        } catch (e) {
            console.error(e);
        }
    });
    bot.hears(rp.changeTimeZoneAction, async ctx => {
        return await botActions.StartTimeZoneDetermination(ctx, db);
    });

    bot.action('tz cancel', async ctx => {
        tzPendingConfirmationUsers.splice(tzPendingConfirmationUsers.indexOf(ctx.from.id), 1);
        let text = rp.tzCancelReponse;
        if (!await db.HasUserID(ctx.from.id)) {
            text += '\r\n' + rp.tzCancelWarning;
        }
        try {
            ctx.editMessageText('...');
            await ctx.answerCbQuery();
            await ctx.replyWithHTML(text, rp.mainKeyboard);
            await ctx.deleteMessage();
        } catch (e) {
            console.error(e);
        }
    });
    bot.action('repeat', async ctx => {
        let text = ctx.callbackQuery.message.text;
        let scheduleText = text.match(/"[\s\S]+"/g)[0];
        scheduleText = scheduleText.substring(1, scheduleText.length - 1);
        let chatID = botActions.FormatChatId(ctx.callbackQuery.message.chat.id);
        let username = 'none';
        if (chatID[0] == '_') {
            username = ctx.from.username;
        }
        let tz = await db.GetUserTZ(ctx.from.id);
        let ts = Math.floor((Date.now() + repeatScheduleTime) / 1000) * 1000;
        let schedule = [{ chatID: chatID, text: scheduleText, timestamp: ts, username: username }];

        try {
            await db.AddNewSchedules(schedule);
            ctx.answerCbQuery();
            ctx.editMessageText(text + '\r\n' + rp.remindSchedule + '<b>' + MiscFunctions.FormDateStringFormat(new Date(ts + tz * 1000)) + '</b>', { parse_mode: 'HTML' });
        } catch (e) {
            console.error(e);
        }
    });

    bot.on('location', async ctx => {
        let location = ctx.message.location;
        try {
            let tz = JSON.parse(await request(`http://api.geonames.org/timezoneJSON?lat=${location.latitude}&lng=${location.longitude}&username=alordash`));
            console.log(`Received location: ${JSON.stringify(location)}`);
            console.log(`tz = ${JSON.stringify(tz)}`);
            let rawOffset = tz.rawOffset;
            let userId = ctx.from.id;
            let ts = rawOffset * 3600;
            if (await db.HasUserID(userId)) {
                await db.RemoveUserTZ(userId);
            }
            await db.AddUserTZ(userId, ts);
            try {
                ctx.replyWithHTML(rp.tzLocation(rawOffset), rp.mainKeyboard);
            } catch (e) {
                console.error(e);
            }
        } catch (e) {
            console.error(e);
        }
    });

    if (!!process.env.YC_FOLDER_ID && !!process.env.YC_API_KEY) {
        bot.on('voice', async ctx => {
            let fileInfo = await ctx.telegram.getFile(ctx.message.voice.file_id);
            let voiceMessage
            let text
            console.log(`Received Voice msg`);
            if (ctx.message.voice.duration < MaximumVoiceMessageDuration) {
                try {
                    let uri = `https://api.telegram.org/file/bot${process.env.SMART_SCHEDULER_TLGRM_API_TOKEN}/${fileInfo.file_path}`;
                    voiceMessage = await request.get({ uri, encoding: null });
                    text = await stt.recognize(voiceMessage);
                } catch (e) {
                    console.error(e);
                }
                if (!!text) {
                    ctx.message.text = text;
                    botActions.HandleTextMessage(ctx, db, tzPendingConfirmationUsers);
                }
            } else {
                try {
                    ctx.replyWithHTML(rp.voiceMessageTooBig);
                } catch (e) {
                    console.error(e);
                }
            }
        });
    }

    bot.on('text', async ctx => {
        console.log(`Received msg`);
        await botActions.HandleTextMessage(ctx, db, tzPendingConfirmationUsers);
    });
}