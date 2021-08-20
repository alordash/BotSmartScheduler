const { DataBase } = require("../../../../storage/dataBase/DataBase");
const { FormStringFormatSchedule } = require("../../../processing/formatting");

/**
 * @param {*} ctx 
 * @param {*} inlineQuery 
 */
async function HandleInlineQuery(ctx) {
    const schedules = await DataBase.Schedules.GetSchedules(ctx.from.id, undefined, undefined, true);
    const user = await DataBase.Users.GetUserById(ctx.from.id);
    let results = [];
    let id = 0;
    const tz = user.tz;
    const language = user.lang;
    for (let schedule of schedules) {
        let text = await FormStringFormatSchedule(schedule, tz, language, false, false);
        results.push({
            type: 'article', id: id++, title: schedule.text, input_message_content: { message_text: text, parse_mode: 'html' }
        });
    }
    ctx.answerInlineQuery(results, 10);
}

module.exports = HandleInlineQuery;