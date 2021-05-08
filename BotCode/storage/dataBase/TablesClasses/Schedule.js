const { Connector } = require('../Connector');
const { Encrypt, Decrypt } = require('../../encryption/encrypt');

const GetOptions = Object.freeze({
   all: 0,
   draft: 1,
   valid: 2,
   invalid: 3,
   statusDisplay: 4
});

const ScheduleStates = Object.freeze({
   valid: 'valid',
   pending: 'pending',
   repeat: 'repeat',
   invalid: 'invalid',
   statusDisplay: 'statusDisplay'
});

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
   /**@type {ScheduleStates} */
   state;
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
    * @param {ScheduleStates} state 
    * @param {Number} message_id 
    * @param {Number} creation_date 
    */
   constructor(chatid, num, text, username, target_date, period_time, max_date, file_id = '~', state = ScheduleStates.valid, message_id = null, creation_date = null) {
      this.chatid = chatid;
      this.num = num;
      this.text = text;
      this.username = username;
      this.target_date = target_date;
      this.period_time = period_time;
      this.max_date = max_date;
      this.file_id = file_id;
      this.state = state;
      this.message_id = message_id;
      this.creation_date = creation_date;
   }

   /**
    * @param {Schedule} schedule 
    * @param {Boolean} decrypt 
    * @returns {Schedule}
    */
   static FixSchedule(schedule, decrypt = true) {
      schedule.period_time = +schedule.period_time;
      schedule.target_date = +schedule.target_date;
      schedule.max_date = +schedule.max_date;
      if (schedule.trello_card_id == 'undefined') {
         schedule.trello_card_id = undefined;
      }
      if (decrypt) {
         schedule.text = Decrypt(schedule.text, schedule.chatid);
      }
      return schedule;
   }

   /**
    * @param {Array.<Schedule>} schedules 
    * @param {Boolean} decrypt 
    * @returns {Array.<Schedule>}
    */
   static FixSchedulesRow(schedules, decrypt = true) {
      for (const i in schedules) {
         schedules[i] = Schedule.FixSchedule(schedules[i], decrypt);
      }
      return schedules;
   }

   /**
    * @param {String} query 
    * @param {GetOptions} getOptions 
    * @param {Number} message_id 
    * @param {String} chatid 
    * @returns {String}
    */
   static ApplyGetOptions(query, getOptions = GetOptions.all, message_id = null, chatid = null) {
      let keyWord = 'WHERE';
      if (query.indexOf('WHERE') != -1) {
         keyWord = 'AND';
      }
      switch (getOptions) {
         case GetOptions.all:
            query = `${query} ${keyWord} state != '${ScheduleStates.statusDisplay}'`;
            break;

         case GetOptions.draft:
            query = `${query} ${keyWord} (state = '${ScheduleStates.repeat}' OR state = '${ScheduleStates.pending}')`;
            break;

         case GetOptions.valid:
            query = `${query} ${keyWord} state = '${ScheduleStates.valid}'`;
            break;

         case GetOptions.invalid:
            query = `${query} ${keyWord} state = '${ScheduleStates.invalid}'`;
            break;

         case GetOptions.statusDisplay:
            query = `${query} ${keyWord} state = '${ScheduleStates.statusDisplay}'`;
            break;

         default:
            break;
      }
      if (query.indexOf('WHERE') != -1) {
         keyWord = 'AND';
      }
      if ((message_id != null) && (chatid != null)) {
         query = `${query} ${keyWord} message_id = ${message_id} AND chatid = '${chatid}'`;
      }
      return query;
   }

   /**
    * @param {Array.<Schedule>} newSchedules
    * @param {String} chatID
    */
   static async AddSchedules(chatID, newSchedules) {
      let queryString = `INSERT INTO schedules (ChatID, num, text, username, target_date, period_time, max_date, file_id, trello_card_id, state, message_id, creation_date) VALUES `;
      let num = await this.GetSchedulesCount(chatID) + 1;
      let values = [];
      let i = 0;
      for (let schedule of newSchedules) {
         if (schedule.chatid[0] != '_' || typeof (schedule.username) == 'undefined') {
            schedule.username = 'none';
         }
         const text = Encrypt(schedule.text, schedule.chatid);
         queryString = `${queryString}($${++i}, $${++i}, $${++i}, $${++i}, $${++i}, $${++i}, $${++i}, $${++i}, $${++i}, $${++i}, $${++i}, $${++i}), `;
         values.push(`${schedule.chatid}`, num, `${text}`, `${schedule.username}`, schedule.target_date, schedule.period_time, schedule.max_date, `${schedule.file_id}`, `${schedule.trello_card_id}`, schedule.state, schedule.message_id, schedule.creation_date);
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
      let num;
      if (schedule.state == ScheduleStates.repeat) {
         num = -1;
      } else {
         num = await this.GetSchedulesCount(schedule.chatid) + 1;
      }
      console.log(`Target_date = ${schedule.target_date}`);
      const text = Encrypt(schedule.text, schedule.chatid);
      await Connector.instance.paramQuery(`INSERT INTO schedules (ChatID, num, text, username, target_date, period_time, max_date, file_id, trello_card_id, state, message_id, creation_date) VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
         [`${schedule.chatid}`, num, `${text}`, `${schedule.username}`, schedule.target_date, schedule.period_time, schedule.max_date, `${schedule.file_id}`, `${schedule.trello_card_id}`, schedule.state, schedule.message_id, schedule.creation_date]);
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
    * @param {Schedule} schedule 
    * @param {Number} id 
    */
   static async SetSchedule(schedule, id = schedule.id) {
      const text = Encrypt(schedule.text, schedule.chatid);
      await Connector.instance.paramQuery(`UPDATE schedules SET
      ChatID = $1,
      text = $2,
      username = $3,
      target_date = $4,
      period_time = $5,
      max_date = $6,
      file_id = $7,
      trello_card_id = $8,
      state = $9,
      message_id = $10,
      creation_date = $11
      WHERE id = ${id}`,
         [`${schedule.chatid}`, `${text}`, `${schedule.username}`, schedule.target_date, schedule.period_time, schedule.max_date, `${schedule.file_id}`, `${schedule.trello_card_id}`, schedule.state, schedule.message_id, schedule.creation_date]);
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
    * @param {String} chatid 
    */
   static async RemoveSchedules(schedules = [], message_id = null, chatid = null) {
      let query = `DELETE FROM schedules`;
      if (schedules.length == 0 && message_id == null) {
         return;
      }
      if (schedules.length) {
         query = `${query} WHERE (`;
         for (const schedule of schedules) {
            query = `${query} id = ${schedule.id} OR`;
         }
         query = `${query.substring(0, query.length - 3)})`;
      }
      if ((message_id != null) && (chatid != null)) {
         query = Schedule.ApplyGetOptions(query, GetOptions.all, message_id, chatid);
      }
      await Connector.instance.Query(query);
   }

   /**
    * @param {String} chatID 
    * @param {ScheduleStates} state 
    * @returns 
    */
   static async RemoveSchedulesByState(chatID, state) {
      return await Connector.instance.Query(`DELETE FROM schedules WHERE chatid = '${chatID}' AND state = '${state}'`);
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
      let res = await Connector.instance.Query(`SELECT * FROM ReorderSchedules('${chatID}')`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         return Schedule.FixSchedulesRow(res.rows);
      } else {
         return [];
      }
   }

   /**
    * @param {String} chatID
    * @returns {Array.<Schedule>}
    */
   static async ListSchedules(chatID) {
      if (!Connector.instance.sending) {
         return await this.GetSchedules(chatID, GetOptions.valid);
      }
      return [];
   }

   /**
    * @param {Number} tsNow
    * @returns {Array.<Schedule>}
    */
   static async CheckActiveSchedules(tsNow) {
      let expiredSchedules = [];
      let schedules = await this.GetAllSchedules(GetOptions.valid);
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
         return Schedule.FixSchedule(res.rows[0]);
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
         return Schedule.FixSchedule(res.rows[0]);
      } else {
         return undefined;
      }
   }

   /**
    * @param {GetOptions} getOptions 
    * @param {Boolean} decrypt 
    * @returns {Array.<Schedule>}
    */
   static async GetAllSchedules(getOptions = GetOptions.all, decrypt = true) {
      let query = Schedule.ApplyGetOptions(`SELECT * FROM schedules`, getOptions);
      let res = await Connector.instance.Query(query);
      console.log(`Picked all schedules ${JSON.stringify(res.rows)}`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         return Schedule.FixSchedulesRow(res.rows, decrypt);
      } else {
         return [];
      }
   }

   /**
    * @param {String} chatID 
    * @param {GetOptions} getOptions 
    * @param {Number} message_id 
    * @returns {Array.<Schedule>}
    */
   static async GetSchedules(chatID, getOptions = GetOptions.all, message_id = null) {
      let query = Schedule.ApplyGetOptions(`SELECT * FROM schedules WHERE ChatID = '${chatID}'`, getOptions, message_id, chatID);
      let res = await Connector.instance.Query(query);
      console.log(`Picked schedules ${JSON.stringify(res.rows)} from chat "${chatID}"`);
      if (typeof (res) != 'undefined' && res.rows.length > 0) {
         return Schedule.FixSchedulesRow(res.rows);
      } else {
         return [];
      }
   }

   /**
    * @param {String} chatID 
    * @param {GetOptions} getOptions 
    * @returns {Number}
    */
   static async GetSchedulesCount(chatID, getOptions = GetOptions.all) {
      let query = Schedule.ApplyGetOptions(`SELECT Count(*) FROM schedules WHERE ChatID = '${chatID}'`, getOptions);
      let res = await Connector.instance.Query(query);
      return +res.rows[0].count;
   }

   /**@param {Array.<Schedule>} schedules */
   static async ConfirmSchedules(schedules) {
      if (schedules.length <= 0) {
         return;
      }
      let query = '';
      for (const schedule of schedules) {
         query = `${query}SELECT ConfirmSchedule(${schedule.id}, '${ScheduleStates.valid}', '${ScheduleStates.valid}');\r\n`;
      }
      return await Connector.instance.Query(query);
   }

   static async GetTotalSchedulesCount() {
      return +(await Connector.instance.Query('SELECT Max(id) FROM schedules')).rows[0].max;
   }
}

module.exports = { Schedule, GetOptions, ScheduleStates };