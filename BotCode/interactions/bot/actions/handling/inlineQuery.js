const { wordsParseDate } = require("@alordash/date-parser");
const { arrayParseString } = require("@alordash/parse-word-to-number");
const { DataBase, Schedule } = require("../../../../storage/dataBase/DataBase");
const { ScheduleStates } = require("../../../../storage/dataBase/TablesClasses/Schedule");
const { FormStringFormatSchedule, ShortenString, FormDateStringFormat } = require("../../../processing/formatting");
const { ProcessParsedDate } = require("../../../processing/timeProcessing");
const { SimpleScheduleParse, FormParsedDates } = require("../remindersParsing");

/**
 * @param {*} ctx 
 * @param {String} query 
 */
async function TryInlineQuerySchedule(ctx, query = ctx.inlineQuery.query) {
    let results = [];
    let id = 0;

    let parsedDates = FormParsedDates(query, 40);
    console.log('parsedDates.length :>> ', parsedDates.length);
    if (parsedDates.length <= 0) {
        return;
    }

    let user = await DataBase.Users.GetUserById(ctx.from.id);
    console.log('user :>> ', user);
    const language = user.lang;

    let schedules = SimpleScheduleParse(parsedDates, user);
    console.log('schedules.length :>> ', schedules.length);
    if (schedules.length <= 0) {
        return false;
    }

    for (let schedule of schedules) {
        let title = ShortenString(schedule.text, 50);
        let description = `📝 ${FormDateStringFormat(new Date(schedule.target_date + user.tz * 1000))}`;
        let message_text = await FormStringFormatSchedule(schedule, user.tz, language, false, false, true);
        let result = { type: 'article', id: id++, description, title, input_message_content: { message_text, parse_mode: 'html' } };
        results.push(result);
    }
    ctx.answerInlineQuery(results, 10);
    return true;
}

/**
 * @param {*} ctx 
 */
async function InlineQuerySearch(ctx) {
    let query = ctx.inlineQuery.query.toLocaleLowerCase();
    let results = [];
    let id = 0;

    const schedules = await DataBase.Schedules.GetSchedules(ctx.from.id, undefined, undefined, true);
    const user = await DataBase.Users.GetUserById(ctx.from.id);

    for (let schedule of schedules) {
        if (schedule.state != ScheduleStates.valid || !schedule.text.toLocaleLowerCase().includes(query))
            continue;
        let title = ShortenString(schedule.text, 30);
        let description = `▪️ ${FormDateStringFormat(new Date(schedule.target_date + user.tz * 1000))}`;

        let message_text = await FormStringFormatSchedule(schedule, user.tz, user.lang, false, false);

        let result = { type: 'article', id: id++, title, input_message_content: { message_text, parse_mode: 'html' } };
        if (true || schedule.text.length > 20) {
            result['description'] = description;
        }
        results.push(result);
    }
    ctx.answerInlineQuery(results, { cache_time: 5 });
}

/**
 * @param {*} ctx 
 */
async function HandleInlineQuery(ctx) {
    if (await TryInlineQuerySchedule(ctx))
        return;
    InlineQuerySearch(ctx);
}

/**
 * @param {*} ctx 
 * @param {String} text 
 */
async function ConfirmInlineQuerySchedule(ctx, text) {
    let id = parseInt(ctx.chosenInlineResult.result_id);
    let schedule = SimpleScheduleParse(ctx.chosenInlineResult.query, await DataBase.Users.GetUserById(ctx.from.id), 40, id)[0];
    if (schedule != undefined)
        DataBase.Schedules.AddSchedule(schedule);
}

module.exports = { HandleInlineQuery, ConfirmInlineQuerySchedule };