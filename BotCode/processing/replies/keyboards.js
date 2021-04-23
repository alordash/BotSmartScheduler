const Markup = require('telegraf/markup');
const Extra = require('telegraf/extra');
const { LoadReplies } = require('./replies');

/**@param {Languages} language */
function ListKeyboard(language) {
    const replies = LoadReplies(language);
    return Markup.keyboard([
        [{ text: replies.showListAction }]
    ]).removeKeyboard().resize().extra();
}

/**@param {Languages} language */
function TzDeterminationKeyboard(language) {
    const replies = LoadReplies(language);
    return Markup
        .keyboard([
            [{ text: replies.tzUseLocation, request_location: true }, { text: replies.tzTypeManually }],
            [{ text: replies.cancel }]
        ]).resize()
        .extra();
}

/**@param {Languages} language */
function TzDeterminationOnStartInlineKeyboard(language) {
    const replies = LoadReplies(language);
    return Extra.markup((m) =>
        m.inlineKeyboard([
            m.callbackButton(replies.startTZ, `startTZ`)
        ])
    );
}

/**@param {Languages} language */
function CancelKeyboard(language) {
    const replies = LoadReplies(language);
    return Markup
        .keyboard([
            [{ text: replies.cancel }]
        ]).oneTime()
        .resize()
        .extra();
}

/**@param {Languages} language */
function CancelButton(language) {
    const replies = LoadReplies(language);
    return Extra.markup((m) =>
        m.inlineKeyboard([
            m.callbackButton(replies.cancel, 'cancel')
        ])
    );
}

/**@param {Languages} language */
function ConfirmScheduleKeyboard(language) {
    const replies = LoadReplies(language);
    return Extra.markup((m) =>
        m.inlineKeyboard([
            m.callbackButton(replies.confirmSchedule, `confirm`),
            m.callbackButton(replies.declineSchedule, `delete`)
        ])
    );
}

module.exports = {
    ListKeyboard,
    TzDeterminationKeyboard,
    TzDeterminationOnStartInlineKeyboard,
    CancelKeyboard,
    CancelButton,
    ConfirmScheduleKeyboard
}