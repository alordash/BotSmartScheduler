const { Pool } = require('pg');
const Chat = require('./classes/Chat');
const Schedule = require('./classes/Schedule');
const User = require('./classes/User');
const Migrations = require('./Migrations');

class DataBaseOptions {
   /**@type {String} */
   user;
   /**@type {String} */
   host;
   /**@type {String} */
   dataBasePath;
   /**@type {String} */
   password;
   /**@type {Number} */
   port;
   /**@type {Object} */
   ssl;
}

class DataBase {
   /**@type {Pool} */
   pool;
   /**@type {Boolean} */
   sending;
   
   Chats = Chat;
   Schedules = Schedule;
   Users = User;

   constructor(options) {
      this.pool = new Pool(options);
      this.sending = false;
   }

   async Query(query) {
      const client = await this.pool.connect();
      let res;
      try {
         res = await client.query(query);
      } catch (err) {
         console.error(err.stack);
      } finally {
         client.release();
         return res;
      }
   }

   async paramQuery(query, values) {
      const client = await this.pool.connect();
      let res;
      try {
         res = await client.query({
            rowMode: 'array',
            text: query,
            values
         });
      } catch (err) {
         console.error(err.stack);
      } finally {
         client.release();
         return res;
      }
   }
   
   static async InitializeDataBase() {
      await Migrations.InitializeTables();

      await Migrations.ExpandSchedulesTable('trello_card_id');

      await Migrations.ExpandUsersIdsTable('trello_token');

      await Migrations.ExpandChatsTable('trello_token');

      if (process.env.SMART_SCHEDULER_ENCRYPT_SCHEDULES === 'true') {
         await Migrations.EncryptSchedules();
      }
      console.log(`Data base initialization finished`);
   }

   /**@type {DataBase} */
   static instance;

   static get instance() {
      if (typeof (this.instance) == 'undefined') {
         throw "Data base connection wasn't initialized before call";
      }
      return this.instance;
   }

   /**
    * @param {DataBaseOptions} options 
    */
   static Instantiate(options) {
      this.instance = new DataBase(options);
   }
}

module.exports = {
   DataBaseOptions,
   DataBase,
   Chat,
   Schedule,
   User
};