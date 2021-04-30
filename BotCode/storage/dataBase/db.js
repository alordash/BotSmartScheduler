const { DataBaseConnectionOptions, DataBaseConnection } = require('./Connection');
const Chat = require('./classes/Chat');
const Schedule = require('./classes/Schedule');
const User = require('./classes/User');
const Migrations = require('./Migrations');

class dbManagement {
   constructor(options) {
      DataBaseConnection.Instantiate(options);
      DataBaseConnection.instance.sending = false;
   }

   chats = Chat;
   schedules = Schedule;
   users = User;

   async InitDB() {
      Migrations.Initialize();

      await Migrations.ExpandSchedulesTable('trello_card_id');

      await Migrations.ExpandUsersIdsTable('trello_token');

      await Migrations.ExpandChatsTable('trello_token');

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
}