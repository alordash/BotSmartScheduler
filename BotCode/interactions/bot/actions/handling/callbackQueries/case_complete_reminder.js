const Extra = require('telegraf/extra');
const { Languages, LoadReplies } = require('../../../static/replies/repliesLoader');
const Format = require('../../../../processing/formatting');
const { DataBase, User, Chat } = require('../../../../../storage/dataBase/DataBase');
const { Schedule, GetOptions, ScheduleStates } = require('../../../../../storage/dataBase/TablesClasses/Schedule');
const { TrelloManager } = require('@alordash/node-js-trello');
const utils = require('../../../../processing/utilities');
const { StartTimeZoneDetermination } = require('../../technical');

/**
 * @param {*} ctx 
 * @param {Array.<Number>} tzPendingConfirmationUsers
 * @param {Array.<String>} trelloPendingConfirmationUsers 
 * @param {String} chatID 
 * @param {User} user 
 * @param {Languages} language 
 * @param {*} replies 
 */
async function CaseCompleteReminder(ctx, tzPendingConfirmationUsers, trelloPendingConfirmationUsers, chatID, user, language, replies) {
    let schedules = await DataBase.Schedules.GetSchedules(chatID, GetOptions.valid, undefined, true);
    if (schedules.length == 0)
        return 0;

    let hasCaption = typeof (ctx.callbackQuery.message.text) == 'undefined' ? true : false;
    let text = (hasCaption ? ctx.callbackQuery.message.caption : ctx.callbackQuery.message.text);
    text = text.substring(text.indexOf(' ') + 1);
    let schedule;
    let found = false;
    for (schedule of schedules) {
        if (schedule.period_time > 0 && schedule.text == text) {
            found = true;
            break;
        }
    }
    if (!found)
        return 0;

    try {
        DataBase.Schedules.RemoveSchedules([schedule]);
        let newText = `✅ ${text}`;
        if (hasCaption) {
            ctx.editMessageCaption(newText, { parse_mode: 'HTML' });
        } else {
            ctx.editMessageText(newText, { parse_mode: 'HTML' });
        }
        ctx.editMessageReplyMarkup(Extra.markup((m) =>
            m.inlineKeyboard([]).removeKeyboard()
        ));
    } catch (e) {
        console.error(e);
    }
}

module.exports = CaseCompleteReminder;