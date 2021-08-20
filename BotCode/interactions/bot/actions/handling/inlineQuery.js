const { DataBase } = require("../../../../storage/dataBase/DataBase");
const { FormStringFormatSchedule, ShortenString } = require("../../../processing/formatting");

/**
 * @param {*} ctx 
 * @param {*} inlineQuery 
 */
async function HandleInlineQuery(ctx) {
    const query = ctx.inlineQuery.query;
    let results = [];
    let id = 0;

    const schedules = await DataBase.Schedules.GetSchedules(ctx.from.id, undefined, undefined, true);
    const user = await DataBase.Users.GetUserById(ctx.from.id);
    const tz = user.tz;
    const language = user.lang;

    for (let schedule of schedules) {
        if (!schedule.text.includes(query))
            continue;
        let title = ShortenString(schedule.text, 20, false, '');
        let message_text = await FormStringFormatSchedule(schedule, tz, language, false, false);
        let result = { type: 'article', id: id++, title, input_message_content: { message_text, parse_mode: 'html' } };
        if (schedule.text.length > 20) {
            result['description'] = ShortenString(schedule.text, 50);
        }
        results.push(result);
    }
    ctx.answerInlineQuery(results, 10);
}

module.exports = HandleInlineQuery;