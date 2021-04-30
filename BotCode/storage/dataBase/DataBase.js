const { ConnectorOptions, Connector } = require('./Connector');
const Chat = require('./TablesClasses2/Chat');
const Schedule = require('./TablesClasses2/Schedule');
const User = require('./TablesClasses2/User');
const Migrations = require('./Migrations');

class DataBase {
   constructor() {
      if (this.constructor == DataBase) {
         throw new Error("DataBase class can't be instantiated.");
      }
   }

   static Chats = Chat;
   static Schedules = Schedule;
   static Users = User;

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

   /**
    * @param {ConnectorOptions} options 
    */
   static EstablishConnection(options) {
      Connector.Instantiate(options);
   }
}

module.exports = {
   DataBase,
   Chat,
   Schedule,
   User
};