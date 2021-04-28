module.exports.Schedule = class {
   /**@type {String} */
   chatid;
   /**@type {Number} */
   id;
   /**@type {String} */
   text;
   /**@type {Number} */
   target_date;
   /**@type {Number} */
   period_time;
   /**@type {Number} */
   max_date;
   /**@type {String} */
   username;
   /**@type {Number} */
   file_id;
   /**@type {String} */
   trello_card_id;

   /**@param {String} chatid 
    * @param {Number} id 
    * @param {String} text 
    * @param {String} username 
    * @param {Number} target_date 
    * @param {Number} period_time 
    * @param {Number} max_date 
    * @param {Number} file_id 
    */
   constructor(chatid, id, text, username, target_date, period_time, max_date, file_id) {
      this.chatid = chatid;
      this.id = id;
      this.text = text;
      this.username = username;
      this.target_date = target_date;
      this.period_time = period_time;
      this.max_date = max_date;
      this.file_id = file_id;
   }
}

module.exports.User = class {
   /**@type {Number} */
   id;
   /**@type {Number} */
   tz;
   /**@type {String} */
   lang;
   /**@type {Boolean} */
   subscribed;
   /**@type {String} */
   trello_token;

   /**@param {Number} id 
    * @param {Number} tz 
    * @param {String} lang 
    * @param {Boolean} subscribed 
    * @param {String} trello_token 
    */
   constructor(id, tz = global.defaultUserTimezone, lang = global.defaultUserLanguage, subscribed = true, trello_token = null) {
      if(typeof(id) == 'object') {
         tz = +id.tz;
         lang = id.lang;
         subscribed = id.subscribed;
         trello_token = id.trello_token;
         id = +id.id;
      }
      this.id = id;
      this.tz = tz;
      this.lang = lang;
      this.subscribed = true;
      this.trello_token = trello_token;
   }
}

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