const { Pool } = require('pg');
const { Encrypt, Decrypt } = require('../encryption/encrypt');
const { Schedule, User, Chat } = require('./classes');

class dbManagement {
   constructor(options) {
      this.pool = new Pool(options);
      this.sending = false;
      this.waitingForServiceMsgs = [];
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

   /**@param {Array.<Schedule>} newSchedules
    * @param {String} chatID
    */
   async AddSchedules(chatID, newSchedules) {
      let queryString = `INSERT INTO schedules VALUES `;
      let id = await this.GetSchedulesCount(chatID) + 1;
      let values = [];
      let i = 0;
      for (let schedule of newSchedules) {
         if (schedule.chatid[0] != '_' || typeof (schedule.username) == 'undefined') {
            schedule.username = 'none';
         }
         const text = Encrypt(schedule.text, schedule.chatid);
         queryString = `${queryString}($${++i}, $${++i}, $${++i}, $${++i}, $${++i}, $${++i}, $${++i}, $${++i}, $${++i}), `;
         values.push(`${schedule.chatid}`, id, `${text}`, `${schedule.username}`, schedule.target_date, schedule.period_time, schedule.max_date, `${schedule.file_id}`, `${schedule.trello_card_id}`);
         id++;
      }
      queryString = queryString.substring(0, queryString.length - 2);
      await this.paramQuery(queryString, values);
   }

   /**@param {Schedule} schedule */
   async AddSchedule(schedule) {
      if (schedule.chatid[0] != '_' || typeof (schedule.username) == 'undefined') schedule.username = 'none';
      let id = await this.GetSchedulesCount(schedule.chatid) + 1;
      console.log(`Target_date = ${schedule.target_date}`);
      const text = Encrypt(schedule.text, schedule.chatid);
      await this.paramQuery('INSERT INTO schedules VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
         [`${schedule.chatid}`, id, `${text}`, `${schedule.username}`, schedule.target_date, schedule.period_time, schedule.max_date, `${schedule.file_id}`, `${schedule.trello_card_id}`]);
      console.log(`Added "${schedule.text}" (encrypted: "${text}") to ${schedule.target_date} from chat "${schedule.chatid}"`);
   }

   /**@param {Number} chatID 
    * @param {Number} id 
    * @param {Number} target_date 
    */
   async SetScheduleTargetDate(chatID, id, target_date) {
      await this.Query(
         `UPDATE schedules 
      SET target_date = ${target_date}
      WHERE ChatID = '${chatID}'
      AND id = ${id};`
      );
   }

   /**@param {Number} chatID 
    * @param {Number} id 
    * @param {String} text 
    */
   async SetScheduleText(chatID, id, text) {
      await this.paramQuery(
         `UPDATE schedules 
      SET text = $1
      WHERE ChatID = $2
      AND id = $3;`,
         [text, chatID, id]);
   }

   /**@param {String} chatID
    * @param {Number} id
    */
   async RemoveScheduleById(chatID, id) {
      console.log(`Removing schedule \r\ChatID = "${chatID}"`);
      let query = `DELETE FROM schedules WHERE ChatID = '${chatID}' AND id = ${id}`;
      console.log(`QUERY = "${query}"`);
      let res = await this.Query(query);
      console.log(`res = ${JSON.stringify(res.rows)}`);
   }

   /**@param {String} chatID
    * @param {String} s
    */
   async RemoveSchedules(chatID, s) {
      console.log(`Removing schedule s = "${s}"\r\nChatID = "${chatID}" typeof(ChatID) = ${typeof (chatID)}`);
      let query = `DELETE FROM schedules WHERE ChatID = '${chatID}' AND (${s})`;
      console.log(`QUERY = "${query}"`);
      let res = await this.Query(query);
      console.log(`res = ${JSON.stringify(res.rows)}`);
   }

   /**@param {String} chatID */
   async ClearAllSchedules(chatID) {
      console.log(`Clearing all schedules in chat ${chatID}`);
      await this.Query(`DELETE FROM schedules WHERE ChatID = '${chatID}'`);
      console.log(`Cleared all schedules`);
   }

   /**@param {String} chatID
    */
   async ReorderSchedules(chatID) {
      console.log(`Reordering schedules in chat: ${chatID}`);
      let res = await this.Query(`DO
      $do$
      DECLARE
         s int;
      BEGIN
         s := 1;
         SELECT Max(id) FROM schedules WHERE chatid = '${chatID}' INTO s;
         IF s IS NULL THEN
            s:= 1;
         END IF;
         FOR i IN REVERSE s..1 LOOP
            IF NOT EXISTS (SELECT FROM schedules WHERE chatid = '${chatID}' AND id = i) THEN
               UPDATE schedules SET id = id - 1 WHERE chatid = '${chatID}' AND id > i;
            END IF;
         END LOOP;
      END
      $do$;`);
      return res;
   }

   /**@param {String} chatID
    * @returns {Array.<Schedule>}
    */
   async ListSchedules(chatID) {
      if (!this.sending) {
         return await this.GetSchedules(chatID);
      }
      return [];
   }

   /**@param {Number} tsNow
    * @returns {Array.<Schedule>}
    */
   async CheckActiveSchedules(tsNow) {
      let expiredSchedules = [];
      let schedules = await this.GetAllSchedules();
      for (let schedule of schedules) {
         console.log(`schedule = ${JSON.stringify(schedule)}, tsNow = ${tsNow}`);
         if (schedule.target_date <= tsNow || schedule.trello_card_id != null) {
            expiredSchedules.push(schedule);
         }
      }
      return expiredSchedules;
   }

   /**@param {String} chatID
    * @param {String} text
    * @returns {Schedule}
    */
   async GetScheduleByText(chatID, text) {
      const encryptedText = Encrypt(text, chatID);
      let res = await this.Query(`SELECT * FROM schedules WHERE text = '${encryptedText}' AND ChatID = '${chatID}'`);
      console.log(`Picked schedule by text ${JSON.stringify(res.rows)}`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         return res.rows[0];
      } else {
         return undefined;
      }
   }

   /**@param {String} chatID
    * @param {Number} id
    * @returns {Schedule}
    */
   async GetScheduleById(chatID, id) {
      let res = await this.Query(`SELECT * FROM schedules WHERE id = '${id}' AND ChatID = '${chatID}'`);
      console.log(`Picked schedule by id ${JSON.stringify(res.rows)}`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         res.rows[0].text = Decrypt(res.rows[0].text, res.rows[0].chatid);
         return res.rows[0];
      } else {
         return undefined;
      }
   }

   /**@returns {Array.<Schedule>} */
   async GetAllSchedules() {
      let res = await this.Query(`SELECT * FROM schedules`);
      console.log(`Picked schedules ${JSON.stringify(res.rows)}`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         return res.rows;
      } else {
         return [];
      }
   }

   /**@param {String} chatID
    * @returns {Array.<Schedule>}
    */
   async GetSchedules(chatID) {
      let res = await this.Query(`SELECT * FROM schedules WHERE ChatID = '${chatID}'`);
      let i = res.rows.length;
      while (i--) {
         let schedule = res.rows[i];
         res.rows[i].text = Decrypt(schedule.text, schedule.chatid);
      }
      console.log(`Picked schedules ${JSON.stringify(res.rows)}`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         return res.rows;
      } else {
         return [];
      }
   }

   /**@param {String} chatID
    * @returns {Number}
    */
   async GetSchedulesCount(chatID) {
      let res = await this.Query(`SELECT Count(*) FROM schedules WHERE ChatID = '${chatID}'`);
      return +res.rows[0].count;
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
    * @returns {Number}
    */
   async GetUserTZ(id) {
      let res = await this.Query(`SELECT * FROM userids where id = ${id}`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         return parseInt(res.rows[0].tz);
      } else {
         return undefined;
      }
   }

   /**@param {Number} id 
    * @returns {String} 
    */
   async GetUserLanguage(id) {
      let res = await this.Query(`SELECT * FROM userids where id = ${id}`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         return res.rows[0].lang;
      } else {
         return global.defaultUserLanguage;
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
   async RemoveUserTZ(id) {
      return await this.Query(`DELETE FROM userids WHERE id = ${id}`);
   }

   /**@param {Number} id 
    * @returns {User}
    */
   async GetUserById(id) {
      return (await this.Query(`SELECT * FROM userids WHERE id = ${id}`)).rows[0];
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

   /**
    * @param {String} id 
    * @param {String} trello_board_id 
    */
   async AddChat(id, trello_board_id) {
      let query = `INSERT INTO chats VALUES ('${id}')`;
      if (typeof (trello_board_id) != 'undefined') {
         query = `INSERT INTO chats VALUES ('${id}', '${trello_board_id}')`;
      }
      return await this.Query(query);
   }

   /**
    * @param {String} id 
    * @returns {Chat} 
    */
   async GetChatById(id) {
      return (await this.Query(
         `SELECT * FROM chats
         WHERE id = '${id}'`
      )).rows[0];
   }

   /**
    * @param {String} id 
    * @param {String} trello_board_id 
    */
   async SetChatTrelloBoard(id, trello_board_id) {
      return await this.paramQuery(
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
   async SetChatTrelloList(id, trello_list_id, trello_token) {
      return await this.Query(
         `UPDATE chats
         SET trello_list_id = '${trello_list_id}',
         trello_token = '${trello_token}'
         WHERE id = '${id}'`
      );
   }

   async ClearChatFromTrello(id) {
      return await this.Query(
         `UPDATE chats
         SET trello_board_id = NULL,
         trello_list_id = NULL,
         trello_token = NULL
         WHERE id = '${id}'`
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
      await this.RemoveUserTZ(455780449);
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