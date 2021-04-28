module.exports.Chat = class Chat {
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
}