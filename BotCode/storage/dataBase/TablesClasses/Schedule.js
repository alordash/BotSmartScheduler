const { Connector } = require('../Connector');
const { Encrypt, Decrypt } = require('../../encryption/encrypt');

class Schedule {
   /**@type {String} */
   chatid;
   /**@type {Number} */
   num;
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
   /**@type {Number} */
   id;
   /**@type {Boolean} */
   pending;
   /**@type {Number} */
   message_id;
   /**@type {Number} */
   creation_date;

   /**@param {String} chatid 
    * @param {Number} num 
    * @param {String} text 
    * @param {String} username 
    * @param {Number} target_date 
    * @param {Number} period_time 
    * @param {Number} max_date 
    * @param {Number} file_id 
    * @param {Boolean} pending 
    * @param {Number} message_id 
    * @param {Number} creation_date 
    */
   constructor(chatid, num, text, username, target_date, period_time, max_date, file_id = '~', pending = false, message_id = null, creation_date = null) {
      this.chatid = chatid;
      this.num = num;
      this.text = text;
      this.username = username;
      this.target_date = target_date;
      this.period_time = period_time;
      this.max_date = max_date;
      this.file_id = file_id;
      this.pending = pending;
      this.message_id = message_id;
      this.creation_date = creation_date;
   }

   /**
    * @param {Schedule} schedule 
    * @returns {Schedule}
    */
   static FixSchedule(schedule) {
      schedule.period_time = +schedule.period_time;
      schedule.target_date = +schedule.target_date;
      schedule.max_date = +schedule.max_date;
      if (schedule.trello_card_id == 'undefined') {
         schedule.trello_card_id = undefined;
      }
      return schedule;
   }

   static GetOptions = Object.freeze({
      all: 0,
      pending: 1,
      valid: 2
   });

   /**
    * @param {String} query 
    * @param {Schedule.GetOptions} getOptions 
    * @param {Number} message_id 
    * @returns {String}
    */
   static ApplyGetOptions(query, getOptions = Schedule.GetOptions.all, message_id = -1) {
      let keyWord = 'WHERE';
      if (query.indexOf('WHERE') != -1) {
         keyWord = 'AND';
      }
      switch (getOptions) {
         case Schedule.GetOptions.pending:
            query = `${query} ${keyWord} pending = true`;
            break;

         case Schedule.GetOptions.valid:
            query = `${query} ${keyWord} pending = false`;
            break;

         default:
            break;
      }
      if (query.indexOf('WHERE') != -1) {
         keyWord = 'AND';
      }
      if (message_id != -1) {
         query = `${query} ${keyWord} message_id = ${message_id}`;
      }
      return query;
   }

   /**
    * @param {Array.<Schedule>} newSchedules
    * @param {String} chatID
    */
   static async AddSchedules(chatID, newSchedules) {
      let queryString = `INSERT INTO schedules (ChatID, num, text, username, target_date, period_time, max_date, file_id, trello_card_id, pending, message_id, creation_date) VALUES `;
      let num = await this.GetSchedulesCount(chatID) + 1;
      let values = [];
      let i = 0;
      for (let schedule of newSchedules) {
         if (schedule.chatid[0] != '_' || typeof (schedule.username) == 'undefined') {
            schedule.username = 'none';
         }
         const text = Encrypt(schedule.text, schedule.chatid);
         queryString = `${queryString}($${++i}, $${++i}, $${++i}, $${++i}, $${++i}, $${++i}, $${++i}, $${++i}, $${++i}, $${++i}, $${++i}, $${++i}), `;
         values.push(`${schedule.chatid}`, num, `${text}`, `${schedule.username}`, schedule.target_date, schedule.period_time, schedule.max_date, `${schedule.file_id}`, `${schedule.trello_card_id}`, schedule.pending, schedule.message_id, schedule.creation_date);
         num++;
      }
      queryString = queryString.substring(0, queryString.length - 2);
      await Connector.instance.paramQuery(queryString, values);
   }

   /**
    * @param {Schedule} schedule
    */
   static async AddSchedule(schedule) {
      if (schedule.chatid[0] != '_' || typeof (schedule.username) == 'undefined') schedule.username = 'none';
      let num = await this.GetSchedulesCount(schedule.chatid) + 1;
      console.log(`Target_date = ${schedule.target_date}`);
      const text = Encrypt(schedule.text, schedule.chatid);
      await Connector.instance.paramQuery(`INSERT INTO schedules (ChatID, num, text, username, target_date, period_time, max_date, file_id, trello_card_id, pending, message_id, creation_date) VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
         [`${schedule.chatid}`, num, `${text}`, `${schedule.username}`, schedule.target_date, schedule.period_time, schedule.max_date, `${schedule.file_id}`, `${schedule.trello_card_id}`, schedule.pending, schedule.message_id, schedule.creation_date]);
      console.log(`Added "${schedule.text}" (encrypted: "${text}") to ${schedule.target_date} from chat "${schedule.chatid}"`);
   }

   /**
    * @param {Number} chatID 
    * @param {Number} num 
    * @param {Number} target_date 
    */
   static async SetScheduleTargetDate(chatID, num, target_date) {
      await Connector.instance.Query(
         `UPDATE schedules 
      SET target_date = ${target_date}
      WHERE ChatID = '${chatID}'
      AND num = ${num};`
      );
   }

   /**
    * @param {Number} chatID 
    * @param {Number} num 
    * @param {String} text 
    */
   static async SetScheduleText(chatID, num, text) {
      await Connector.instance.paramQuery(
         `UPDATE schedules 
      SET text = $1
      WHERE ChatID = $2
      AND num = $3;`,
         [text, chatID, num]);
   }

   /**
    * @param {String} chatID
    * @param {Number} num
    */
   static async RemoveScheduleByNum(chatID, num) {
      console.log(`Removing schedule \r\ChatID = "${chatID}"`);
      let query = `DELETE FROM schedules WHERE ChatID = '${chatID}' AND num = ${num}`;
      console.log(`QUERY = "${query}"`);
      let res = await Connector.instance.Query(query);
      console.log(`res = ${JSON.stringify(res.rows)}`);
   }

   /**
    * @param {Array.<Schedule>} schedules 
    * @param {Number} message_id 
    */
   static async RemoveSchedules(schedules = [], message_id = -1) {
      let query = `DELETE FROM schedules`;
      if(schedules.length == 0 && message_id == -1) {
         return;
      }
      if (schedules.length) {
         query = `${query} WHERE (`;
         for (const schedule of schedules) {
            query = `${query} id = ${schedule.id} OR`;
         }
         query = `${query.substring(0, query.length - 3)})`;
      }
      if(message_id != -1) {
         query = Schedule.ApplyGetOptions(query, Schedule.GetOptions.all, message_id);
      }
      await Connector.instance.Query(query);
   }

   /**
    * @param {String} chatID
    * @param {String} s
    */
   static async RemoveSchedulesQuery(chatID, s) {
      console.log(`Removing schedule s = "${s}"\r\nChatID = "${chatID}" typeof(ChatID) = ${typeof (chatID)}`);
      let query = `DELETE FROM schedules WHERE ChatID = '${chatID}' AND (${s})`;
      console.log(`QUERY = "${query}"`);
      let res = await Connector.instance.Query(query);
      console.log(`res = ${JSON.stringify(res.rows)}`);
   }

   /**
    * @param {String} chatID 
    */
   static async ClearAllSchedules(chatID) {
      console.log(`Clearing all schedules in chat ${chatID}`);
      await Connector.instance.Query(`DELETE FROM schedules WHERE ChatID = '${chatID}'`);
      console.log(`Cleared all schedules`);
   }

   /**
    * @param {String} chatID
    */
   static async ReorderSchedules(chatID) {
      console.log(`Reordering schedules in chat: ${chatID}`);
      let res = await Connector.instance.Query(`DO
      $do$
      DECLARE
         s int;
      BEGIN
         s := 1;
         SELECT Max(num) FROM schedules WHERE chatid = '${chatID}' INTO s;
         IF s IS NULL THEN
            s:= 1;
         END IF;
         FOR i IN REVERSE s..1 LOOP
            IF NOT EXISTS (SELECT FROM schedules WHERE chatid = '${chatID}' AND num = i) THEN
               UPDATE schedules SET num = num - 1 WHERE chatid = '${chatID}' AND num > i;
            END IF;
         END LOOP;
      END
      $do$;`);
      return res;
   }

   /**
    * @param {String} chatID
    * @returns {Array.<Schedule>}
    */
   static async ListSchedules(chatID) {
      if (!Connector.instance.sending) {
         return await this.GetSchedules(chatID, Schedule.GetOptions.valid);
      }
      return [];
   }

   /**
    * @param {Number} tsNow
    * @returns {Array.<Schedule>}
    */
   static async CheckActiveSchedules(tsNow) {
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

   /**
    * @param {String} chatID
    * @param {String} text
    * @returns {Schedule}
    */
   static async GetScheduleByText(chatID, text) {
      const encryptedText = Encrypt(text, chatID);
      let res = await Connector.instance.Query(`SELECT * FROM schedules WHERE text = '${encryptedText}' AND ChatID = '${chatID}'`);
      console.log(`Picked schedule by text ${JSON.stringify(res.rows)}`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         return res.rows[0];
      } else {
         return undefined;
      }
   }

   /**
    * @param {String} chatID
    * @param {Number} num
    * @returns {Schedule}
    */
   static async GetScheduleByNum(chatID, num) {
      let res = await Connector.instance.Query(`SELECT * FROM schedules WHERE num = '${num}' AND ChatID = '${chatID}'`);
      console.log(`Picked schedule by num ${JSON.stringify(res.rows)}`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         res.rows[0].text = Decrypt(res.rows[0].text, res.rows[0].chatid);
         return res.rows[0];
      } else {
         return undefined;
      }
   }

   /**
    * @param {Schedule.GetOptions} getOptions 
    * @returns {Array.<Schedule>}
    */
   static async GetAllSchedules(getOptions = Schedule.GetOptions.all) {
      let query = Schedule.ApplyGetOptions(`SELECT * FROM schedules`, getOptions);
      let res = await Connector.instance.Query(query);
      console.log(`Picked all schedules ${JSON.stringify(res.rows)}`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         return res.rows;
      } else {
         return [];
      }
   }

   /**
    * @param {String} chatID 
    * @param {Schedule.GetOptions} getOptions 
    * @param {Number} message_id 
    * @returns {Array.<Schedule>}
    */
   static async GetSchedules(chatID, getOptions = Schedule.GetOptions.all, message_id = -1) {
      let query = Schedule.ApplyGetOptions(`SELECT * FROM schedules WHERE ChatID = '${chatID}'`, getOptions, message_id);
      let res = await Connector.instance.Query(query);
      let i = res.rows.length;
      while (i--) {
         let schedule = res.rows[i];
         res.rows[i].text = Decrypt(schedule.text, schedule.chatid);
      }
      console.log(`Picked schedules ${JSON.stringify(res.rows)} from chat "${chatID}"`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         for (const i in res.rows) {
            res.rows[i] = Schedule.FixSchedule(res.rows[i]);
         }
         return res.rows;
      } else {
         return [];
      }
   }

   /**
    * @param {String} chatID 
    * @param {Schedule.GetOptions} getOptions 
    * @returns {Number}
    */
   static async GetSchedulesCount(chatID, getOptions = Schedule.GetOptions.all) {
      let query = Schedule.ApplyGetOptions(`SELECT Count(*) FROM schedules WHERE ChatID = '${chatID}'`, getOptions);
      let res = await Connector.instance.Query(query);
      return +res.rows[0].count;
   }

   /**@param {Array.<Schedule>} schedules */
   static async ConfirmSchedules(schedules) {
      let query = `UPDATE schedules
      SET pending = false,
      message_id = NULL
      WHERE (`;
      for (const schedule of schedules) {
         query = `${query} id = ${schedule.id} OR`;
      }
      query = `${query.substring(0, query.length - 3)}) AND (`;
      for (const schedule of schedules) {
         query = `${query} message_id = ${schedule.message_id} OR`;
      }
      query = `${query.substring(0, query.length - 3)})`;
      return await Connector.instance.Query(query);
   }
}

module.exports = Schedule;