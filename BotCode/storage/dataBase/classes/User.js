const { DataBase } = require('../Connection');

class User {
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


   /**@param {User} user */
   static async AddUser(user) {
      return await DataBase.instance.Query(`INSERT INTO userids VALUES (${user.id}, ${user.tz}, '${user.lang}', true)`);
   }

   /**@param {Number} id
    * @param {Number} tz
    */
   static async SetUserTz(id, tz) {
      return await DataBase.instance.Query(
         `UPDATE userids 
         SET tz = ${tz}
         WHERE id = ${id};`
      );
   }

   /**@param {Number} id 
    * @param {String} language 
    */
   static async SetUserLanguage(id, language) {
      return await DataBase.instance.Query(
         `UPDATE userids
         SET lang = '${language}'
         WHERE id = ${id};`
      );
   }

   /**@param {Number} id 
    * @returns {String} 
    */
   static async GetUserLanguage(id) {
      let res = await DataBase.instance.Query(`SELECT * FROM userids where id = ${id}`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         return res.rows[0].lang;
      } else {
         return undefined;
      }
   }

   /**@param {Number} id 
    * @param {Boolean} subscribed 
    */
   static async SetUserSubscription(id, subscribed) {
      return await DataBase.instance.Query(
         `UPDATE userids
         SET subscribed = ${subscribed}
         WHERE id = ${id};`
      );
   }

   /**@param {Number} id 
    * @returns {Boolean} 
    */
   static async IsUserSubscribed(id) {
      let res = await DataBase.instance.Query(`SELECT * FROM userids where id = ${id}`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         return res.rows[0].subscribed;
      } else {
         return true;
      }
   }

   /**@returns {Array.<User>} */
   static async GetAllUsers() {
      let users = await DataBase.instance.Query(`SELECT * FROM userids`);
      if (typeof (users) != 'undefined' && users.rows.length > 0) {
         console.log(`Picked users count: ${users.rows.length}`);
         return users.rows;
      } else {
         console.log(`Picked users count: 0`);
         return [];
      }
   }

   /**@param {Number} id */
   static async RemoveUser(id) {
      return await DataBase.instance.Query(`DELETE FROM userids WHERE id = ${id}`);
   }

   /**@param {Number} id 
    * @returns {User}
    */
   static async GetUserById(id, real = false) {
      let res = await DataBase.instance.Query(`SELECT * FROM userids WHERE id = ${id}`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         return new User(res.rows[0]);
      } else if (!real) {
         return new User();
      } else {
         return new User(null, null, null, null, null);
      }
   }

   /**@param {Number} id
    * @returns {Boolean}
    */
   static async HasUserID(id) {
      let res = await DataBase.instance.Query(`SELECT * FROM userids WHERE id = ${id}`);
      return typeof (res) != 'undefined' && res.rows.length > 0
   }

   /**
    * @param {Number} id 
    * @param {String} trello_token 
    */
   static async SetUserTrelloToken(id, trello_token) {
      return await DataBase.instance.paramQuery(
         `UPDATE userids
         SET trello_token = $1
         WHERE id = ${id}`,
         [trello_token]
      );
   }

   /**
    * @param {Number} id 
    */
   static async ClearUserTrelloToken(id) {
      return await DataBase.instance.Query(
         `UPDATE userids 
         SET trello_token = NULL
         WHERE id = ${id};`
      );
   }
}

module.exports = User;