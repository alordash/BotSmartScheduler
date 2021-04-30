const { Pool } = require('pg');
const { Encrypt, Decrypt } = require('../encryption/encrypt');
const Chat = require('./classes/Chat');
const Schedule = require('./classes/Schedule');
const User = require('./classes/User');

class dbManagement {
   constructor(options) {
      this.pool = new Pool(options);
      this.sending = false;
      this.waitingForServiceMsgs = [];
   }

   chats = Chat;
   schedules = Schedule;
   users = User;

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

   /**@param {User} user */
   async AddUser(user) {
      return await this.Query(`INSERT INTO userids VALUES (${user.id}, ${user.tz}, '${user.lang}', true)`);
   }

   /**@param {Number} id
    * @param {Number} tz
    */
   async SetUserTz(id, tz) {
      return await this.Query(
         `UPDATE userids 
         SET tz = ${tz}
         WHERE id = ${id};`
      );
   }

   /**@param {Number} id 
    * @param {String} language 
    */
   async SetUserLanguage(id, language) {
      return await this.Query(
         `UPDATE userids
         SET lang = '${language}'
         WHERE id = ${id};`
      );
   }

   /**@param {Number} id 
    * @returns {String} 
    */
   async GetUserLanguage(id) {
      let res = await this.Query(`SELECT * FROM userids where id = ${id}`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         return res.rows[0].lang;
      } else {
         return undefined;
      }
   }

   /**@param {Number} id 
    * @param {Boolean} subscribed 
    */
   async SetUserSubscription(id, subscribed) {
      return await this.Query(
         `UPDATE userids
         SET subscribed = ${subscribed}
         WHERE id = ${id};`
      );
   }

   /**@param {Number} id 
    * @returns {Boolean} 
    */
   async IsUserSubscribed(id) {
      let res = await this.Query(`SELECT * FROM userids where id = ${id}`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         return res.rows[0].subscribed;
      } else {
         return true;
      }
   }

   /**@returns {Array.<User>} */
   async GetAllUsers() {
      let users = await this.Query(`SELECT * FROM userids`);
      if (typeof (users) != 'undefined' && users.rows.length > 0) {
         console.log(`Picked users count: ${users.rows.length}`);
         return users.rows;
      } else {
         console.log(`Picked users count: 0`);
         return [];
      }
   }

   /**@param {Number} id */
   async RemoveUser(id) {
      return await this.Query(`DELETE FROM userids WHERE id = ${id}`);
   }

   /**@param {Number} id 
    * @returns {User}
    */
   async GetUserById(id, real = false) {
      let res = await this.Query(`SELECT * FROM userids WHERE id = ${id}`);
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
   async HasUserID(id) {
      let res = await this.Query(`SELECT * FROM userids WHERE id = ${id}`);
      return typeof (res) != 'undefined' && res.rows.length > 0
   }

   /**
    * @param {Number} id 
    * @param {String} trello_token 
    */
   async SetUserTrelloToken(id, trello_token) {
      return await this.paramQuery(
         `UPDATE userids
         SET trello_token = $1
         WHERE id = ${id}`,
         [trello_token]
      );
   }

   /**
    * @param {Number} id 
    */
   async ClearUserTrelloToken(id) {
      return await this.Query(
         `UPDATE userids 
         SET trello_token = NULL
         WHERE id = ${id};`
      );
   }

   async EncryptSchedules() {
      let schedules = await this.GetAllSchedules();
      for (const schedule of schedules) {
         let encrypted = true;
         const key = schedule.chatid;
         let text = schedule.text;
         try {
            text = Decrypt(text, key);
         } catch (e) {
            console.log(`Schedule #${schedule.id} in chat ${schedule.chatid} is not encrypted`);
            encrypted = false;
            text = schedule.text;
         }
         if (!encrypted) {
            const encryptedText = Encrypt(text, key);
            await this.Query(`UPDATE schedules
            SET text = '${encryptedText}'
            WHERE id = ${schedule.id}`);
            console.log(`Updated not encrypted schedule "${schedule.text}"`);
         }
      }
   }

   async ExpandSchedulesTable(column_name) {
      const column = await this.Query(`SELECT column_name 
      FROM information_schema.columns
      WHERE table_name='schedules' AND column_name = '${column_name}'`);
      if (column.rowCount > 0) {
         return;
      }

      await this.Query(`ALTER TABLE schedules DROP COLUMN IF EXISTS ts`);
      await this.Query(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS target_date BIGINT`);
      await this.Query(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS period_time BIGINT`);
      await this.Query(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS max_date BIGINT`);
      await this.Query(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS file_id TEXT`);
      await this.Query(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS trello_card_id TEXT`);
   }

   async ExpandUsersIdsTable(column_name) {
      const column = await this.Query(`SELECT column_name 
      FROM information_schema.columns
      WHERE table_name='userids' AND column_name = '${column_name}'`);
      if (column.rowCount > 0) {
         return;
      }

      let users = await this.GetAllUsers();
      await this.Query(`ALTER TABLE userids ADD COLUMN IF NOT EXISTS lang TEXT`);
      await this.Query(`ALTER TABLE userids ADD COLUMN IF NOT EXISTS subscribed BOOLEAN`);
      await this.Query(`ALTER TABLE userids ADD COLUMN IF NOT EXISTS trello_token TEXT`);
      for (let user of users) {
         console.log(`User "${user.id}" doesn't have '${column_name}' field`);
      }
   }

   async ExpandChatsTable(column_name) {
      const column = await this.Query(`SELECT column_name 
      FROM information_schema.columns
      WHERE table_name='chats' AND column_name = '${column_name}'`);
      if (column.rowCount > 0) {
         return;
      }

      await this.Query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS trello_board_id TEXT`);
      await this.Query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS trello_list_id TEXT`);
      await this.Query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS trello_token TEXT`);
   }

   async InitDB() {
      await this.Query('CREATE TABLE IF NOT EXISTS schedules (ChatID TEXT, id INTEGER, text TEXT, username TEXT, target_date BIGINT, period_time BIGINT, max_date BIGINT, file_id TEXT, trello_card_id TEXT)');
      await this.Query('CREATE TABLE IF NOT EXISTS userids (id BIGINT, tz BIGINT, lang TEXT, subscribed BOOLEAN, trello_token TEXT)');
      await this.Query('CREATE TABLE IF NOT EXISTS chats (id TEXT, trello_board_id TEXT, trello_list_id TEXT, trello_token TEXT)');

      await this.ExpandSchedulesTable('trello_card_id');

      await this.ExpandUsersIdsTable('trello_token');

      await this.ExpandChatsTable('trello_token');

      if (process.env.SMART_SCHEDULER_ENCRYPT_SCHEDULES === 'true') {
         await this.EncryptSchedules();
      }
      console.log(`Data base initialization finished`);
   }
}

module.exports = {
   dbManagement,
   Schedule,
   User,
   Chat
};