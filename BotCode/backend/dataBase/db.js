const { Pool } = require('pg');

class Schedule {
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

   /**@param {String} chatid 
    * @param {Number} id 
    * @param {String} text 
    * @param {String} username 
    * @param {Number} target_date 
    * @param {Number} period_time 
    * @param {Number} max_date 
    */
   constructor(chatid, id, text, username, target_date, period_time, max_date) {
      this.chatid = chatid;
      this.id = id;
      this.text = text;
      this.username = username;
      this.target_date = target_date;
      this.period_time = period_time;
      this.max_date = max_date;
   }
}

class User {
   /**@type {Number} */
   id;
   /**@type {Number} */
   tz;
   /**@type {String} */
   lang;

   /**@param {Number} id 
    * @param {Number} tz 
    * @param {String} lang 
    */
   constructor(id, tz, lang) {
      this.id = id;
      this.tz = tz;
      this.lang = lang;
   }
}

class dbManagement {
   defaultUserLanguage = 'en';
   defaultUserTimezone = 3 * 3600;
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

   /**@param {Array.<Schedule>} newSchedules
    * @param {String} chatID
    */
   async AddSchedules(chatID, newSchedules) {
      let queryString = `INSERT INTO schedules VALUES `;
      let schedules = await this.GetSchedules(chatID);
      let id = schedules.length + 1;
      for (let schedule of newSchedules) {
         if (schedule.chatid[0] != '_' || typeof (schedule.username) == 'undefined') {
            schedule.username = 'none';
         }
         queryString += `('${schedule.chatid}', ${id}, '${schedule.text}', '${schedule.username}', ${schedule.target_date}, ${schedule.period_time}, ${schedule.max_date}), `;
         id++;
      }
      queryString = queryString.substring(0, queryString.length - 2);
      await this.Query(queryString);
      console.log(`Added multiple schedules = ${JSON.stringify(newSchedules)}`);
   }

   /**@param {Schedule} schedule */
   async AddSchedule(schedule) {
      if (schedule.chatid[0] != '_' || typeof (schedule.username) == 'undefined') schedule.username = 'none';
      let schedules = await this.GetSchedules(schedule.chatid);
      let id = schedules.length + 1;
      console.log(`Target_date = ${schedule.target_date}`);
      await this.Query(`INSERT INTO schedules VALUES ('${schedule.chatid}', ${id}, '${schedule.text}', '${schedule.username}', ${schedule.target_date}, ${schedule.period_time}, ${schedule.max_date})`);
      console.log(`Added "${schedule.text}" to ${schedule.target_date} from chat "${schedule.chatid}"`);
   }

   /**@param {Number} id 
    * @param {Number} target_date 
    */
   async SetScheduleTargetDate(id, target_date) {
      await this.Query(
         `UPDATE schedules 
      SET target_date = ${target_date}
      WHERE id = ${id};`
      );
   }

   /**@param {String} chatID
    * @param {Number} id
    */
   async RemoveScheduleById(chatID, id) {
      console.log(`Removing schedule s = ${"s"}\r\ChatID = "${chatID}" typeof(ChatID) = ${typeof (chatID)}`);
      let query = `DELETE FROM schedules WHERE ChatID = '${chatID}' AND id = ${id}`;
      console.log(`QUERY = "${query}"`);
      let res = await this.Query(query);
      console.log(`res = ${JSON.stringify(res.rows)}`);
   }

   /**@param {String} chatID
    * @param {String} s
    */
   async RemoveSchedules(chatID, s) {
      console.log(`Removing schedule s = "${s}"\r\ChatID = "${chatID}" typeof(ChatID) = ${typeof (chatID)}`);
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
    * @returns {Boolean}
    */
   async ReorderSchedules(chatID) {
      let schedules = await this.GetSchedules(chatID);
      if (schedules.length > 0) {
         schedules.sort((a, b) => a.id - b.id);
      }
      if (schedules.length > 0) {
         await this.Query(`DELETE FROM schedules WHERE ChatID = '${chatID}'`);
         let queryString = `INSERT INTO schedules VALUES `;
         for (let i = 0; i < schedules.length; i++) {
            let schedule = schedules[i];
            queryString += `('${chatID}', ${i + 1}, '${schedule.text}', '${schedule.username}', ${schedule.target_date}, ${schedule.period_time}, ${schedule.max_date}), `;
            console.log(`Reordering schedule with new id = ${i + 1}`);
         }
         queryString = queryString.substring(0, queryString.length - 2);
         console.log(`queryString = "${queryString}"`);
         await this.Query(queryString);
         return true;
      }
      return false;
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
         if (schedule.target_date <= tsNow) {
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
      let res = await this.Query(`SELECT * FROM schedules WHERE text = '${text}' AND ChatID = '${chatID}'`);
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
      console.log(`Picked schedules ${JSON.stringify(res.rows)}`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         return res.rows;
      } else {
         return [];
      }
   }

   /**@param {User} user */
   async AddUser(user) {
      return await this.Query(`INSERT INTO userids VALUES (${user.id}, ${user.tz}, '${user.lang}')`);
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
         return this.defaultUserTimezone;
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
         return this.defaultUserLanguage;
      }
   }

   /**@returns {Array.<User>} */
   async GetAllUsers() {
      let users = await this.Query(`SELECT * FROM userids`);
      console.log(`Picked users ${JSON.stringify(users.rows)}`);
      if (typeof (users) != 'undefined' && users.rows.length > 0) {
         return users.rows;
      } else {
         return [];
      }
   }

   /**@param {Number} id */
   async RemoveUserTZ(id) {
      return await this.Query(`DELETE FROM userids WHERE id = ${id}`);
   }

   /**@param {Number} id
    * @returns {Boolean}
    */
   async HasUserID(id) {
      let res = await this.Query(`SELECT * FROM userids where id = ${id}`);
      return typeof (res) != 'undefined' && res.rows.length > 0
   }

   async FixSchedulesTable() {
      let schedules = await this.GetAllSchedules();
      await this.Query(`ALTER TABLE schedules DROP COLUMN ts`);
      await this.Query(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS target_date BIGINT`);
      await this.Query(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS period_time BIGINT`);
      await this.Query(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS max_date BIGINT`);
      for (let schedule of schedules) {
         console.log(`Schedule with id: ${schedule.id} doesn't have target_date, period_time and max_date fields`);
         await this.Query(
            `UPDATE schedules 
            SET target_date = ${+schedule.ts},
            period_time = 0,
            max_date = 0
            WHERE id = ${schedule.id};`
         );
      }
   }

   async FixUsersIdsTable() {
      let users = await this.GetAllUsers();
      await this.Query(`ALTER TABLE userids ADD COLUMN IF NOT EXISTS lang TEXT`);
      for (let user of users) {
         console.log(`User with id: ${user.id} doesn't have "lang" field`);
         await this.Query(
            `UPDATE userids 
            SET lang = '${this.defaultUserLanguage}'
            WHERE id = ${user.id};`);
      }
   }

   async InitDB() {
      const checkSchedules = await this.Query(`SELECT table_name 
      FROM information_schema.tables
      WHERE table_name='schedules'`);
      if (checkSchedules.rowCount == 0) {
         await this.Query('CREATE TABLE IF NOT EXISTS schedules (ChatID TEXT, id INTEGER, text TEXT, username TEXT, target_date BIGINT, period_time BIGINT, max_date BIGINT)');
      }
      const checkUsers = await this.Query(`SELECT table_name 
      FROM information_schema.tables
      WHERE table_name='userids'`);
      if (checkUsers.rowCount == 0) {
         await this.Query('CREATE TABLE IF NOT EXISTS userids (id BIGINT, tz BIGINT, lang TEXT)');
      }
      const checkSchedulesColumns = await this.Query(`SELECT column_name 
      FROM information_schema.columns
      WHERE table_name='schedules' AND column_name = 'target_date'`);
      if (checkSchedulesColumns.rowCount == 0) {
         await this.FixSchedulesTable();
      }
      const checkUsersColumns = await this.Query(`SELECT column_name 
      FROM information_schema.columns
      WHERE table_name='userids' AND column_name = 'lang'`)
      if (checkUsersColumns.rowCount == 0) {
         await this.FixUsersIdsTable();
      }
      console.log(`Initialization finished`);
   }
}

module.exports = {
   dbManagement,
   Schedule,
   User
};