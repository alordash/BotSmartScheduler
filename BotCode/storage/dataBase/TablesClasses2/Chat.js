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
    * @param {String} id 
    * @returns {Chat} 
    */
   static async GetChatById(id) {
      return (await Connector.instance.Query(
         `SELECT * FROM chats
      WHERE id = '${id}'`
      )).rows[0];
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