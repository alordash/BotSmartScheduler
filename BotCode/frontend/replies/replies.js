const Markup = require('telegraf/markup');
const Extra = require('telegraf/extra');

const Languages = Object.freeze({
    general: "general",
    RU: "ru",
    EN: "en"
});

/**@param {Languages} language */
function LoadReplies(language) {
    return require(`${__dirname}/${language}.json`);
}

/**@param {Languages} language */
function ListKeyboard(language) {
    const replies = LoadReplies(language);
    return Markup.keyboard([
        [{ text: replies.showListAction }]
    ]).oneTime().removeKeyboard().resize().extra();
}

/**@param {Languages} language */
function TzDeterminationKeyboard(language) {
    const replies = LoadReplies(language);
    return Markup
        .keyboard([
            [{ text: replies.tzUseLocation, request_location: true }, { text: replies.tzTypeManually }],
            [{ text: replies.cancel }]
        ]).oneTime()
        .resize()
        .extra()
}

/**@param {Languages} language */
function TzDeterminationOnStartInlineKeyboard(language) {
    const replies = LoadReplies(language);
    return Extra.markup((m) =>
        m.inlineKeyboard([
            m.callbackButton(replies.startTZ, `startTZ`)
        ]).oneTime()
    );
}

/**
 * @param {String} str 
 * @param {Boolean} newline 
 * @param {Languages} language 
 * @returns {String} 
 */
function Deleted(str, newline, language) {
    const replies = LoadReplies(language);
    return `${replies.deleted} ${str}. ${newline === false ? replies.showList : ``}`;
}

/**
 * @param {Number} hours 
 * @param {Number} minutes 
 * @param {Boolean} isNegative 
 * @returns {String} 
 */
function TzDetermined(hours, minutes, isNegative) {
    let s = '+'
    let t = '';
    if (isNegative) {
        s = '-';
        hours *= -1;
    }
    if (hours < 10) {
        t = '0';
    }
    s += t + hours + ':';
    t = '0';
    if (minutes >= 10) {
        t = '';
    }
    s += t + minutes;
    return s;
}

/**
 * @param {Number} tz 
 * @returns {String} 
 */
function TzLocation(tz) {
    let t = '';
    if (Math.abs(tz) < 10) t = '0';
    if (tz < 0) {
        t = '-' + t;
        tz *= -1;
    }
    else t = '+' + t;
    return t + tz;
}

/**
 * @param {Number} tz 
 * @returns {String} 
 */
function TzCurrent(tz) {
    let negative = tz < 0;
    let hour = tz / 3600 | 0;
    let minutes = Math.abs(tz % 3600 / 60);
    return TzDetermined(hour, minutes, negative);
}

/**
 * @param {String} text 
 * @param {String} myFormattedDate 
 * @param {Languages} language 
 * @returns {String} 
 */
function Scheduled(text, myFormattedDate, language) {
    const replies = LoadReplies(language);
    return `"${text}" ${replies.alreadyScheduled} <b>${myFormattedDate}</b>\r\n`;
}

function TrelloAuthorizationMessage(trello_key, app_name, language) {
    const replies = LoadReplies(language);
    let link = `https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&name=${app_name}&key=${trello_key}`;
    return `${replies.trelloAuthenticate0}${link}${replies.trelloAuthenticate1}`;
}

/**@param {Languages} language */
function CancelKeyboard(language) {
    const replies = LoadReplies(language);
    return Markup
        .keyboard([
            [{ text: replies.cancel }]
        ]).oneTime()
        .resize()
        .extra()
}

module.exports = {
    Languages,
    LoadReplies,
    ListKeyboard,
    TzDeterminationKeyboard,
    TzDeterminationOnStartInlineKeyboard,
    Deleted,
    TzDetermined,
    TzLocation,
    TzCurrent,
    Scheduled,
    TrelloAuthorizationMessage,
    CancelKeyboard
}