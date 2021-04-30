const { Connector } = require('./Connector');
const User = require('./classes/User');
const Schedule = require('./classes/Schedule');
const { Encrypt, Decrypt } = require('../encryption/encrypt');

class Migrations {
   static async InitializeTables() {
      await Connector.instance.Query('CREATE TABLE IF NOT EXISTS schedules (ChatID TEXT, id INTEGER, text TEXT, username TEXT, target_date BIGINT, period_time BIGINT, max_date BIGINT, file_id TEXT, trello_card_id TEXT)');
      await Connector.instance.Query('CREATE TABLE IF NOT EXISTS userids (id BIGINT, tz BIGINT, lang TEXT, subscribed BOOLEAN, trello_token TEXT)');
      await Connector.instance.Query('CREATE TABLE IF NOT EXISTS chats (id TEXT, trello_board_id TEXT, trello_list_id TEXT, trello_token TEXT)');
   }

   /**@param {String} column_name */
   static async ExpandSchedulesTable(column_name) {
      const column = await Connector.instance.Query(`SELECT column_name 
        FROM information_schema.columns
        WHERE table_name='schedules' AND column_name = '${column_name}'`);
      if (column.rowCount > 0) {
         return;
      }

      await Connector.instance.Query(`ALTER TABLE schedules DROP COLUMN IF EXISTS ts`);
      await Connector.instance.Query(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS target_date BIGINT`);
      await Connector.instance.Query(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS period_time BIGINT`);
      await Connector.instance.Query(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS max_date BIGINT`);
      await Connector.instance.Query(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS file_id TEXT`);
      await Connector.instance.Query(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS trello_card_id TEXT`);
   }

   /**@param {String} column_name */
   static async ExpandUsersIdsTable(column_name) {
      const column = await Connector.instance.Query(`SELECT column_name 
        FROM information_schema.columns
        WHERE table_name='userids' AND column_name = '${column_name}'`);
      if (column.rowCount > 0) {
         return;
      }

      let users = await User.GetAllUsers();
      await Connector.instance.Query(`ALTER TABLE userids ADD COLUMN IF NOT EXISTS lang TEXT`);
      await Connector.instance.Query(`ALTER TABLE userids ADD COLUMN IF NOT EXISTS subscribed BOOLEAN`);
      await Connector.instance.Query(`ALTER TABLE userids ADD COLUMN IF NOT EXISTS trello_token TEXT`);
      for (let user of users) {
         console.log(`User "${user.id}" doesn't have '${column_name}' field`);
      }
   }

   /**@param {String} column_name */
   static async ExpandChatsTable(column_name) {
      const column = await Connector.instance.Query(`SELECT column_name 
        FROM information_schema.columns
        WHERE table_name='chats' AND column_name = '${column_name}'`);
      if (column.rowCount > 0) {
         return;
      }

      await Connector.instance.Query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS trello_board_id TEXT`);
      await Connector.instance.Query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS trello_list_id TEXT`);
      await Connector.instance.Query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS trello_token TEXT`);
   }

   static async EncryptSchedules() {
      let schedules = await Schedule.GetAllSchedules();
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
            await Connector.instance.Query(`UPDATE schedules
            SET text = '${encryptedText}'
            WHERE id = ${schedule.id}`);
            console.log(`Updated not encrypted schedule "${schedule.text}"`);
         }
      }
   }
}

module.exports = Migrations;