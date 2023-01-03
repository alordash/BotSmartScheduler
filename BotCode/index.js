const telegraf = require('telegraf');
const { DataBase } = require('./storage/dataBase/DataBase');
const botConfig = require('./interactions/bot/main');
const { CheckExpiredSchedules, CheckPendingSchedules, CheckDisplayStatueMessages } = require('./interactions/bot/actions/remindersChecking');
const utils = require('./interactions/processing/utilities');
const { CopyDatabase, SaveDatabase } = require('./storage/dataBase/copying');
const { startKeepAliveService } = require('./keepAlive');

console.log(`process.env.IS_HEROKU = ${process.env.IS_HEROKU}`);
console.log(`process.env.SMART_SCHEDULER_DB_URL = ${process.env.SMART_SCHEDULER_DB_URL}`);

Number.prototype.div = function (x) {
   return Math.floor(this / x);
}

var SmartSchedulerBot = new telegraf(process.env.SMART_SCHEDULER_TLGRM_API_TOKEN);

let dbUrl;
if (process.env.IS_HEROKU == 'true') {
   dbUrl = new URL(process.env.DATABASE_URL);
} else {
   dbUrl = new URL(process.env.SMART_SCHEDULER_DB_URL);
}
const dbOptions = {
   user: dbUrl.username,
   host: dbUrl.hostname,
   database: dbUrl.pathname.substring(1),
   password: dbUrl.password,
   port: parseInt(dbUrl.port),
   ssl: {
      rejectUnauthorized: false
   }
}

async function Initialization() {
//   startKeepAliveService();

   const now = new Date();
   console.log('now.getTimezoneOffset() :>> ', now.getTimezoneOffset());
   let constants = require('./constants.json');
   for (let [key, value] of Object.entries(constants)) {
      global[key] = value;
   }

   await DataBase.InitializeDataBase();
   await botConfig.InitBot(SmartSchedulerBot);

   if (process.env.ENABLE_SCHEDULES_CHEKING == 'true') {
      utils.RepeatActionsWithPeriod(60000, async function () {
         await CheckExpiredSchedules(SmartSchedulerBot);
         await CheckPendingSchedules(SmartSchedulerBot);
      });
      utils.RepeatActionsWithPeriod(86400000, async function () {
         await CheckDisplayStatueMessages(SmartSchedulerBot);
      });
   }

   if (process.env.ENABLE_LOGS == 'false') {
      console.log = function () { };
   }
}

async function init() {

   // let dbCopy = await CopyDatabase(process.env.SMART_SCHEDULER_COPY_DB_URL);
   console.log('dbOptions :>> ', dbOptions);
   DataBase.EstablishConnection(dbOptions);

   // if (dbCopy.users.length > 0) {
   //    await SaveDatabase(dbCopy.users, dbCopy.chats, dbCopy.schedules);
   // }

   Initialization();
}

init();