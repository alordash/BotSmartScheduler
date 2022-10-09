const { Connector } = require('../Connector');

class Chat {
   /**@type {String} */
   id;
   /**@type {String} */
   trello_board_id;
   /**@type {String} */
   trello_list_id;
   /**@type {String} */
   trello_token;

   constructor(id, trello_board_id, trello_list_id, trello_token) {
      this.id = id;
      this.trello_board_id = trello_board_id;
      this.trello_list_id = trello_list_id;
      this.trello_token = trello_token;
   }

   /**
    * @param {String} id 
    * @param {String} trello_board_id 
    */
   static async AddChat(id, trello_board_id) {
      let query = `INSERT INTO chats VALUES ('${id}')`;
      if (typeof (trello_board_id) != 'undefined') {
         query = `INSERT INTO chats VALUES ('${id}', '${trello_board_id}')`;
      }
      return await Connector.instance.Query(query);
   }

   /**
    * @param {Array.<Chat>} chats 
    */
   static async InsertChats(chats) {
      if (chats.length <= 0) {
         return;
      }
      let query = `INSERT INTO chats VALUES `;
      let i = 0;
      let values = [];
      for (const chat of chats) {
         query = `${query}($${++i}, $${++i}, $${++i}, $${++i}), `;
         values.push(chat.id, chat.trello_board_id, chat.trello_list_id, chat.trello_token);
      }
      query = query.substring(0, query.length - 2);
      await Connector.instance.paramQuery(query, values);
   }

   /**
    * @param {String} id 
    * @returns {Chat} 
    */
   static async GetChatById(id) {
      if (id[0] == '_') {
         id = `-${id.substring(1)}`;
      }
      return (await Connector.instance.Query(
         `SELECT * FROM chats
      WHERE id = '${id}'`
      )).rows[0];
   }

   /**
    * @returns {Array.<Chat>} 
    */
   static async GetAllChats() {
      return (await Connector.instance.Query(
         `SELECT * FROM chats`
      )).rows;
   }

   /**
    * @param {String} id 
    * @param {String} trello_board_id 
    */
   static async SetChatTrelloBoard(id, trello_board_id) {
      return await Connector.instance.paramQuery(
         `UPDATE chats
      SET trello_board_id = $1
      WHERE id = '${id}'`,
         [trello_board_id]
      );
   }

   /**
    * @param {String} id 
    * @param {String} trello_list_id 
    */
   static async SetChatTrelloList(id, trello_list_id, trello_token) {
      return await Connector.instance.Query(
         `UPDATE chats
      SET trello_list_id = '${trello_list_id}',
      trello_token = '${trello_token}'
      WHERE id = '${id}'`
      );
   }

   /**
    * @param {String} id
    */
   static async ClearChatFromTrello(id) {
      return await Connector.instance.Query(
         `UPDATE chats
      SET trello_board_id = NULL,
      trello_list_id = NULL,
      trello_token = NULL
      WHERE id = '${id}'`
      );
   }
}

module.exports = Chat;