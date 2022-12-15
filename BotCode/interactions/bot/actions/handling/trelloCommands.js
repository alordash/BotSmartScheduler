const Markup = require('telegraf/markup');
const { Languages, LoadReplies } = require('../../static/replies/repliesLoader');
const rp = require('../../static/replies/repliesLoader');
const Format = require('../../../processing/formatting');
const kbs = require('../../static/replies/keyboards');
const { DataBase, Schedule, User, Chat } = require('../../../../storage/dataBase/DataBase');
const { TrelloManager } = require('@alordash/node-js-trello');
const { trelloAddListCommand, trelloClear } = require('../../static/commandsList');
const { BotReply, BotReplyMultipleMessages } = require('../replying');
const utils = require('../../../processing/utilities');

/**
 * @param {*} ctx 
 * @param {User} user 
 * @param {Array.<Number>} trelloPendingConfirmationUsers 
 */
async function TrelloCommand(user, ctx, trelloPendingConfirmationUsers) {
   const replies = LoadReplies(user.lang);
   const inGroup = ctx.chat.id < 0;
   let reply = '';
   //#region in group
   let chat = await DataBase.Chats.GetChatById(ctx.chat.id);
   if (chat != null && chat.trello_board_id != null && chat.trello_token != null) {
      let boardTrelloManager = new TrelloManager(process.env.TRELLO_TOKEN, chat.trello_token);
      let board = await boardTrelloManager.GetBoard(chat.trello_board_id);
      if (board != null) {
         let list = board.lists.find(x => x.id == chat.trello_list_id);

         if (list != null) {
            reply = `${Format.FormAlreadyBoardBinded(board, list, user.lang)}\r\n`;
         }
      }
   }
   if (reply == '') {
      reply = `${replies.trelloNoBoardBinded}\r\n`;
   }
   if (!inGroup) {
      if (user.trello_token != null) {
         //#region authorized
         let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, user.trello_token);
         let owner = await trelloManager.GetTokenOwner(user.trello_token);
         let boardsList = [];
         if (owner != null) {
            boardsList = await trelloManager.GetUserBoards(owner.id);
            if (boardsList != null && boardsList.length > 0) {
               reply = `${reply}${Format.FormBoardsList(boardsList, user.lang)}`;
            }
         }
         //#endregion
      } else {
         //#region not authorized
         trelloPendingConfirmationUsers.push(ctx.from.id);
         BotReply(ctx, Format.TrelloAuthorizationMessage(process.env.TRELLO_TOKEN, process.env.SMART_SCHEDULER_BOT_NAME, user.lang),
            kbs.CancelKeyboard(user.lang));
         //#endregion
         return;
      }
   }
   if (ctx.message.text.indexOf(trelloClear) >= 0) {
      if (!inGroup) {
         DataBase.Users.ClearUserTrelloToken(ctx.from.id);
         BotReply(ctx, replies.trelloRemovedToken);
         return;
      } else {
         reply = `${reply}${replies.trelloClearGroupWarn}\r\n`;
      }
   }

   if (reply.length > 0) {
      let answers = Format.SplitBigMessage(reply);
      BotReplyMultipleMessages(ctx, answers);
   }
}

/**
 * @param {*} ctx 
 * @param {Array.<Number>} trelloPendingConfirmationUsers 
 */
async function TrelloAuthenticate(ctx, trelloPendingConfirmationUsers) {
   let token = ctx.message.text;
   const replies = rp.LoadReplies(ctx.from.language_code);
   let match = token.match(/^([a-zA-Z0-9]){64,}$/);
   if (match != null) {
      DataBase.Users.SetUserTrelloToken(ctx.from.id, token);
      trelloPendingConfirmationUsers.splice(trelloPendingConfirmationUsers.indexOf(ctx.from.id), 1);

      let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, token);
      let owner = await trelloManager.GetTokenOwner(token);
      let boardsList = await trelloManager.GetUserBoards(owner.id);

      let reply = `${replies.trelloSavedToken}\r\n${Format.FormBoardsList(boardsList, ctx.from.language_code)}`;

      let chatID = `${ctx.chat.id}`;
      if (chatID[0] == '-') {
         chatID = `_${chatID.substring(1)}`;
      }
      let answers = Format.SplitBigMessage(reply);
      let options = [];
      options[answers.length - 1] = await kbs.LogicalListKeyboard(ctx.from.language_code, utils.FormatChatId(ctx.chat.id));
      BotReplyMultipleMessages(ctx, answers, options);
   } else {
      BotReply(ctx, replies.trelloWrongToken, kbs.CancelButton(ctx.from.language_code));
   }
}

/**
 * @param {*} ctx 
 * @param {User} user
 */
async function TrelloPinCommand(ctx, user) {
   const replies = rp.LoadReplies(user.lang);
   let text = ctx.message.text;
   let match = text.match(/[a-zA-Z0-9]{24}/);
   if (match == null) {
      BotReply(ctx, replies.invalidUseOfCommand);
      return;
   }
   let id = match[0];

   let chat = await DataBase.Chats.GetChatById(`${ctx.chat.id}`);
   let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, user.trello_token);
   let board = await trelloManager.GetBoard(id);

   if (typeof (board) != 'undefined') {
      let chatId = `${ctx.chat.id}`;
      if (typeof (chat) == 'undefined') {
         await DataBase.Chats.AddChat(chatId, id);
      } else {
         await DataBase.Chats.SetChatTrelloBoard(chatId, id);
      }
      let replies = Format.SplitBigMessage(Format.FormBoardListsList(board, user.lang));
      await BotReplyMultipleMessages(ctx, replies);
   } else {
      BotReply(ctx, replies.trelloBoardDoesNotExist);
   }
}

/** @param {*} ctx */
async function TrelloAddList(ctx) {
   let text = ctx.message.text;
   let i = parseInt(text.substring(trelloAddListCommand.length)) - 1;

   let chatId = `${ctx.chat.id}`;
   let user = await DataBase.Users.GetUserById(ctx.from.id);
   const replies = rp.LoadReplies(user.lang);
   let chat = await DataBase.Chats.GetChatById(chatId);
   if (chat.trello_board_id == null) {
      BotReply(ctx, replies.trelloNoBoardBinded);
      return;
   }
   let trelloManager = new TrelloManager(process.env.TRELLO_TOKEN, user.trello_token);
   let board = await trelloManager.GetBoard(chat.trello_board_id);
   let target_list = board.lists[i];
   await DataBase.Chats.SetChatTrelloList(chatId, target_list.id, user.trello_token);
   BotReply(ctx, Format.FormListBinded(board, target_list, user.lang));
}

/**
 * @param {*} ctx 
 * @param {User} user 
 */
async function TrelloUnpinCommand(ctx, user) {
   let chat = await DataBase.Chats.GetChatById(ctx.chat.id);
   DataBase.Chats.ClearChatFromTrello(ctx.chat.id);
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