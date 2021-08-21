const { wordsParseDate } = require("@alordash/date-parser");
const { arrayParseString } = require("@alordash/parse-word-to-number");
const { DataBase, Schedule } = require("../../../../storage/dataBase/DataBase");
const { FormStringFormatSchedule, ShortenString, FormDateStringFormat } = require("../../../processing/formatting");
const { ProcessParsedDate } = require("../../../processing/timeProcessing");

class InlineSchedules {
    /**@type {Array.<Schedule>} */
    schedules = [];
    /**@type {NodeJS.Timeout} */
    timer;
}

/**
 * @param {Array.<InlineSchedules>} inlineSchedules 
 * @param {Number} id 
 * @param {InlineSchedules}
 */
function RemoveInlineSchedule(inlineSchedules, id, newInlineSchedule) {
    let inlineSchedule = inlineSchedules.splice(id, 1)[0];
    if (inlineSchedule != undefined)
        clearTimeout(inlineSchedule.timer);
    if (newInlineSchedule != undefined)
        inlineSchedules[id] = newInlineSchedule;
}

/**
 * @param {*} ctx 
 * @param {Array.<InlineSchedules>} inlineSchedules 
 * @param {String} query 
 */
async function TryInlineQuerySchedule(ctx, inlineSchedules, query = ctx.inlineQuery.query) {
    let results = [];
    let id = 0;
    let parsedDates = wordsParseDate(arrayParseString(query, 1), 1, 40, query);
    if (parsedDates.length <= 0) {
        return false;
    }
    const now = Date.now();

    const user = await DataBase.Users.GetUserById(ctx.from.id);
    const tz = user.tz;
    const language = user.lang;

    let inlineSchedule = new InlineSchedules();
    inlineSchedule.timer = setTimeout(() => {
        inlineSchedules.splice(ctx.from.id, 1);
    }, global.inlineQueryScheduleTimeout);

    for (let parsedDate of parsedDates) {
        let dateParams = ProcessParsedDate(parsedDate, tz, false);
        const dateIsValid = typeof (dateParams) != 'undefined';
        const dateExists = dateIsValid &&
            (dateParams.target_date != 0 ||
                dateParams.period_time != 0 ||
                dateParams.max_date != 0);
        const textIsValid = parsedDate.string.length > 0;
        if (!dateExists || !textIsValid)
            continue;

        let newSchedule = new Schedule(
            ctx.from.id.toString(),
            -1,
            parsedDate.string,
            'none',
            dateParams.target_date,
            dateParams.period_time,
            dateParams.max_date,
            undefined,
            undefined,
            undefined,
            now,
            ctx.from.id);

        inlineSchedule.schedules.push(newSchedule);

        let title = FormDateStringFormat(new Date(newSchedule.target_date + tz * 1000));
        let description = ShortenString(newSchedule.text, 50);
        let message_text = await FormStringFormatSchedule(newSchedule, tz, language, false, false);
        let result = { type: 'article', id: id++, description, title, input_message_content: { message_text, parse_mode: 'html' } };
        results.push(result);
    }
    RemoveInlineSchedule(inlineSchedules, ctx.from.id, inlineSchedule);
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
    const tz = user.tz;
    const language = user.lang;

    for (let schedule of schedules) {
        if (!schedule.text.toLocaleLowerCase().includes(query))
            continue;
        let title = `▪️ ${ShortenString(schedule.text, 20, false, '')}`;
        let message_text = await FormStringFormatSchedule(schedule, tz, language, false, false);
        let result = { type: 'article', id: id++, title, input_message_content: { message_text, parse_mode: 'html' } };
        if (schedule.text.length > 20) {
            result['description'] = ShortenString(schedule.text, 50);
        }
        results.push(result);
    }
    ctx.answerInlineQuery(results, 10);
}

/**
 * @param {*} ctx 
 * @param {Array.<InlineSchedules>} inlineSchedules 
 */
async function HandleInlineQuery(ctx, inlineSchedules) {
    if (await TryInlineQuerySchedule(ctx, inlineSchedules))
        return;
    RemoveInlineSchedule(inlineSchedules, ctx.from.id);
    InlineQuerySearch(ctx);
}

module.exports = { InlineSchedules, HandleInlineQuery };