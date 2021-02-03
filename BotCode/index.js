const telegraf = require('telegraf');
const { dbManagement } = require('./backend/dataBase/db');
const botConfig = require('./frontend/bot/bot');
const botActions = require('./frontend/bot/botActions');

console.log(`process.env.IS_HEROKU = ${process.env.IS_HEROKU}`);

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
let db = new dbManagement(dbOptions);

(async function Initialization() {
   const now = new Date();
   console.log('now.getTimezoneOffset() :>> ', now.getTimezoneOffset());
   let constants = require('./constants.json');
   for (let [key, value] of Object.entries(constants)) {
      global[key] = value;
   }

   await db.InitDB();
   await botConfig.InitBot(SmartSchedulerBot, db);

   let ts = Date.now();
   if (process.env.ENABLE_SCHEDULES_CHEKING == 'true') {
      setTimeout(async function () {
         console.log(`Timeout expired`);
         setInterval(function () { botActions.CheckExpiredSchedules(SmartSchedulerBot, db) }, 60000);
         await botActions.CheckExpiredSchedules(SmartSchedulerBot, db);
      }, (Math.floor(ts / 60000) + 1) * 60000 - ts);
   }

   if (process.env.ENABLE_LOGS == 'false') {
      console.log = function () { };
   }
})();