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