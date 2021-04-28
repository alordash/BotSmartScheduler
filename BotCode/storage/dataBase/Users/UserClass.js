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
      if (typeof (id) == 'object' && id != null) {
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