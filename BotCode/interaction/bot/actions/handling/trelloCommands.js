const Markup = require('telegraf/markup');
const { Languages, LoadReplies } = require('../static/replies/repliesLoader');
const rp = require('../static/replies/repliesLoader');
const Format = require('../../processing/formatting');
const kbs = require('../static/replies/keyboards');
const { dbManagement, Schedule, User, Chat } = require('../../../storage/dataBase/db');
const { TrelloManager } = require('@alordash/node-js-trello');
const { trelloAddListCommand, trelloClear } = require('../static/commandsList');
const { BotReply } = require('./replying');
const utils = require('./utilities');

/**
 * @param {*} ctx 
 * @param {User} user 
 * @param {dbManagement} db 
 * @param {Array.<Number>} trelloPendingConfirmationUsers 
 */
async function TrelloCommand(user, ctx, db, trelloPendingConfirmationUsers) {
   const replies = LoadReplies(user.lang);
   if (ctx.message.text.indexOf(trelloClear) >= 0 && ctx.chat.id >= 0) {
      db.ClearUserTrelloToken(ctx.from.id);
      BotReply(ctx, replies.trelloRemovedToken);
   } else if (user.trello_token == null && ctx.chat.id >= 0) {
      trelloPendingConfirmationUsers.push(ctx.from.id);
      BotReply(ctx, Format.TrelloAuthorizationMessage(process.env.TRELLO_TOKEN, process.env.SMART_SCHEDULER_BOT_NAME, user.lang),
         kbs.CancelKeyboard(user.lang));
   } else {
      let reply = '';

      let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, user.trello_token);
      let owner = await trelloManager.GetTokenOwner(user.trello_token);
      let noBoardBinded = false;
      let boardsList = [];
      if (typeof (owner) != 'undefined') {
         boardsList = await trelloManager.GetUserBoards(owner.id);
         let chat = await db.GetChatById(ctx.chat.id);
         if (typeof (chat) != 'undefined'
            && chat.trello_board_id != null
            && chat.trello_list_id != null
            && chat.trello_token != null) {
            let boardTrelloManager = new TrelloManager(process.env.TRELLO_TOKEN, chat.trello_token);
            let board = await boardTrelloManager.GetBoard(chat.trello_board_id);
            if (typeof (board) == 'undefined') {
               noBoardBinded = true;
            } else {
               let list = board.lists.find(x => x.id == chat.trello_list_id);

               if (list != null) {
                  reply = `${Format.FormAlreadyBoardBinded(board, list, user.lang)}\r\n`;
               } else {
                  noBoardBinded = true;
               }
            }
         } else {
            noBoardBinded = true;
         }
      } else {
         noBoardBinded = true;
      }
      if (noBoardBinded) {
         reply = `${replies.trelloNoBoardBinded}\r\n`;
      }

      if (ctx.chat.id >= 0) {
         reply = `${reply}${Format.FormBoardsList(boardsList, user.lang)}`;
      }
      let answers = Format.SplitBigMessage(reply);
      BotReplyMultipleMessages(ctx, answers);
   }
}

/**
 * @param {*} ctx 
 * @param {dbManagement} db 
 * @param {Array.<Number>} trelloPendingConfirmationUsers 
 */
async function TrelloAuthenticate(ctx, db, trelloPendingConfirmationUsers) {
   let token = ctx.message.text;
   const replies = rp.LoadReplies(ctx.from.language_code);
   let match = token.match(/^([a-zA-Z0-9]){64}$/);
   if (match != null) {
      db.SetUserTrelloToken(ctx.from.id, token);
      trelloPendingConfirmationUsers.splice(trelloPendingConfirmationUsers.indexOf(ctx.from.id), 1);

      let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, token);
      let owner = await trelloManager.GetTokenOwner(token);
      let boardsList = await trelloManager.GetUserBoards(owner.id);

      let reply = `${replies.trelloSavedToken}\r\n${Format.FormBoardsList(boardsList, ctx.from.language_code)}`;

      let chatID = `${ctx.chat.id}`;
      if (chatID[0] == '-') {
         chatID = `_${chatID.substring(1)}`;
      }
      const schedulesCount = (await db.GetSchedules(utils.FormatChatId(ctx.chat.id))).length;
      let answers = Format.SplitBigMessage(reply);
      let options = [];
      options[answers.length - 1] = schedulesCount > 0 ? kbs.ListKeyboard(ctx.from.language_code) : Markup.removeKeyboard();
      BotReplyMultipleMessages(ctx, answers, options);
   } else {
      BotReply(ctx, replies.trelloWrongToken, kbs.CancelButton(ctx.from.language_code));
   }
}

/**
 * @param {*} ctx 
 * @param {dbManagement} db 
 * @param {User} user
 */
async function TrelloPinCommand(ctx, db, user) {
   const replies = rp.LoadReplies(user.lang);
   let text = ctx.message.text;
   let id = text.match(/[a-zA-Z0-9]{24}/)[0];

   let chat = await db.GetChatById(`${ctx.chat.id}`);
   let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, user.trello_token);
   let board = await trelloManager.GetBoard(id);

   if (typeof (board) != 'undefined') {
      let chatId = `${ctx.chat.id}`;
      if (typeof (chat) == 'undefined') {
         await db.AddChat(chatId, id);
      } else {
         await db.SetChatTrelloBoard(chatId, id);
      }
      let replies = Format.SplitBigMessage(Format.FormBoardListsList(board, user.lang));
      await BotReplyMultipleMessages(ctx, replies);
   } else {
      BotReply(ctx, replies.trelloBoardDoesNotExist);
   }
}

/**
 * @param {*} ctx 
 * @param {dbManagement} db 
 */
async function TrelloAddList(ctx, db) {
   let text = ctx.message.text;
   let i = parseInt(text.substring(trelloAddListCommand.length)) - 1;

   let chatId = `${ctx.chat.id}`;
   let user = await db.GetUserById(ctx.from.id);
   const replies = rp.LoadReplies(user.lang);
   let chat = await db.GetChatById(chatId);
   if (chat.trello_board_id == null) {
      BotReply(ctx, replies.trelloNoBoardBinded);
      return;
   }
   let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, user.trello_token);
   let board = await trelloManager.GetBoard(chat.trello_board_id);
   let target_list = board.lists[i];
   await db.SetChatTrelloList(chatId, target_list.id, user.trello_token);
   BotReply(ctx, Format.FormListBinded(board, target_list, user.lang));
}

/**
 * @param {*} ctx 
 * @param {dbManagement} db 
 * @param {User} user 
 */
async function TrelloUnpinCommand(ctx, db, user) {
   let chat = await db.GetChatById(ctx.chat.id);
   db.ClearChatFromTrello(ctx.chat.id);
   if (chat.trello_token != null) {
      let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, chat.trello_token);
      let board = await trelloManager.GetBoard(chat.trello_board_id);
      BotReply(ctx, Format.FormBoardUnbinded(board, user.lang));
   }
}

module.exports = {
   TrelloCommand,
   TrelloAuthenticate,
   TrelloPinCommand,
   TrelloAddList,
   TrelloUnpinCommand
}