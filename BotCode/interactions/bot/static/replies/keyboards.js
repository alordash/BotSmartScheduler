const Markup = require('telegraf/markup');
const Extra = require('telegraf/extra');
const { Languages, LoadReplies } = require('./repliesLoader');
const { DataBase, Schedule } = require('../../../../storage/dataBase/DataBase');

/**
 * @param {Array.<Extra>} keyboards 
 */
function MergeInlineKeyboards(...keyboards) {
   let main_keyboard = keyboards[0];
   if (typeof (main_keyboard.reply_markup.inline_keyboard) == 'undefined') {
      main_keyboard.reply_markup.inline_keyboard = [];
   }
   let count = 0;
   for (let i = 1; i < keyboards.length; i++) {
      let kb = keyboards[i];
      if (typeof (kb) == 'undefined') {
         continue;
      }
      let inline_keyboard = kb.reply_markup.inline_keyboard;
      if (typeof (inline_keyboard) != 'undefined' && inline_keyboard.length > 0) {
         count++;
         main_keyboard.reply_markup.inline_keyboard.push(
            ...inline_keyboard
         );
      }
   }
   if (count > 0 && typeof (main_keyboard.reply_markup.keyboard) != 'undefined') {
      delete main_keyboard.reply_markup.keyboard;
   }
   return main_keyboard;
}

/**@param {Languages} language */
function ListKeyboard(language) {
   const replies = LoadReplies(language);
   return Markup.keyboard([
      [{ text: replies.showListAction }]
   ]).removeKeyboard().resize().extra();
}

/**@param {Languages} language */
function RepeatButton(language) {
   const replies = LoadReplies(language);
   return Extra.markup((m) =>
      m.inlineKeyboard([
         m.callbackButton(replies.repeatSchedule, `repeat`)
      ])
   );
}

/**@param {Languages} language */
function TzDeterminationKeyboard(language) {
   const replies = LoadReplies(language);
   return Markup
      .keyboard([
         [{ text: replies.tzUseLocation, request_location: true }, { text: replies.cancel }]
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
function ConfirmSchedulesKeyboard(language) {
   const replies = LoadReplies(language);
   return Extra.markup((m) =>
      m.inlineKeyboard([
         m.callbackButton(replies.confirmSchedule, `confirm`),
         m.callbackButton(replies.declineSchedule, `delete`)
      ])
   );
}

function RemoveKeyboard() {
   return { reply_markup: { remove_keyboard: true } };
}

/**
 * @param {Languages} language 
 * @param {String} chatID 
 * @param {Number} schedulesCount 
 */
async function LogicalListKeyboard(language, chatID, schedulesCount = -1) {
   if (schedulesCount == -1) {
      schedulesCount = await DataBase.Schedules.GetSchedulesCount(chatID);
   }
   return schedulesCount > 0 ? ListKeyboard(language) : RemoveKeyboard();
}

/**
 * @param {Languages} language 
 */
function HelpSectionsKeyboards(language) {
   const replies = LoadReplies(language);
   return Extra.markup((m) =>
      m.inlineKeyboard([
         m.callbackButton(replies.trelloHelpButton, `help_trello`)
      ])
   );
}

/**
 * @param {Languages} language 
 * @param {String} cb_query 
 */
function BackKeyboard(language, cb_query) {
   const replies = LoadReplies(language);
   return Extra.markup((m) =>
      m.inlineKeyboard([
         m.callbackButton(replies.getBack, cb_query)
      ])
   );
}

/**
 * @param {Languages} language 
 */
function ToTrelloKeyboard(language) {
   const replies = LoadReplies(language);
   return Extra.markup((m) =>
      m.inlineKeyboard([
         m.callbackButton(replies.toTrelloButton, 'to_trello')
      ])
   );
}

module.exports = {
   MergeInlineKeyboards,
   ListKeyboard,
   RepeatButton,
   TzDeterminationKeyboard,
   TzDeterminationOnStartInlineKeyboard,
   CancelKeyboard,
   CancelButton,
   ConfirmSchedulesKeyboard,
   RemoveKeyboard,
   LogicalListKeyboard,
   HelpSectionsKeyboards,
   BackKeyboard,
   ToTrelloKeyboard
}