# Bot Smart Scheduler

## Links

- [Версия на русском языке](README.md)

## Bot understands English and Russian languages

If you need fast and handy tool to schedule your plans, Smart Scheduler Bot is the right choice.

![Usage example](https://habrastorage.org/webt/br/md/wx/brmdwxnbkbo-3pu7ff77fqjrqva.png)

## How to use

[Smart Scheduler Bot works in Telegram.](https://t.me/SmartScheduler_bot)
Just type task with required expiration time and Smart Scheduler will automatically find scheduling date and what task to schedule in your message.
Smart Scheduler will send you notification when particular task's time expires.


## Features

You do not need to follow specified date format, Smart Scheduler understands most of human date formats (e.g. «in 5 minutes, «at 5 minutes to 10 pm», «after tomorrow in half past 1»).  
Also it's not necessary to write perfectly. Bot can understand what you meant to say even **in words with mistakes** (e.g. «in twinty minuts» -> *«in 20 minutes»*).  
You can make multiple reminders in one message by dividing each with dot, comma or word "**and**".  
  
Smart Scheduler can store tasks with *minute precision*.  
Smart Scheduler can generate schedules from **voice messages**.  
Smart Scheduler supports recurring reminders (e.g. «every 5 minutes») and also supports time limits for them (e.g. «every 5 minutes until 20 hours»).  
Smart Scheduler stores tasks **separately** for every chat and can work in conversations.  

### Supported commands:

- 🗓 **/list** - Shows active tasks for current chat.

- 🗑 **/del** _1, 2, ...N_ - Deletes tasks by id.

- 🗑 **/del** _1-10, A-B_ - Deletes all tasks within range.

- #️⃣ **_/N_** - Deletes N-th task.

- 🌐 **_/tz_** - Configures time zone.

and /start with /help of course.


## Installation

This bot requires PostgreSQL data base.  

### Environment variables

Make sure you set following environment variables before starting the bot:  
1. **ENABLE_LOGS**: "true" or "false", enables or disables logging.  
2. **ENABLE_SCHEDULES_CHEKING**: "true" or "false", enables or disables checking and sending notifications.  
3. **TZ**: only "GMT".  
4. **DATABASE_URL** (optional): URL of your PostgreSQL data base.  
5. **SMART_SCHEDULER_DB_URL** (optional): URL of your PostgreSQL data base.  
6. **IS_HEROKU**: "true" or "false". If **true**, then use **DATABASE_URL** for data base URL, else **SMART_SCHEDULER_DB_URL**.  
7. **SMART_SCHEDULER_TLGRM_API_TOKEN**: telegram bot token.  
  
For voice messages (optional):  

8. **YC_API_KEY**: Yandex api key.  
9. **YC_FOLDER_ID**: Yandex catalog id.  

Without these variables the bot will not respond to voice messages.  

### On local server

```
$ git clone https://github.com/alordash/BotSmartScheduler
$ cd BotSmartScheduler
$ npm install
$ node ./BotCode/index.js
```

### Deploying on heroku

1. Create [github](https://github.com/join) account.  
2. Add [this](https://github.com/alordash/BotSmartScheduler) repository to yourself.  
3. Create [heroku](https://signup.heroku.com/) account.  
4. Create new [heroku application](https://dashboard.heroku.com/new-app).  
5. Open created application.  
6. Follow [this link](https://elements.heroku.com/addons/heroku-postgresql).  
7. Press **Install Heroku Postgres**.  
8. In the appeared line type your application name and press **Provision add-on**.  
9. Go to the tab **Settings** of your application.  
10. Press **Reveal Config Vars**.  
11. Fill all necessary enviromental variables.  
12. Go to the tab **Deploy**.  
13. In the field **Deployment method** choose **GitHub**.  
14. Connect your github account to heroku by pressing **Connect to GitHub**.  
15. In appeared window choose *your* respository, press **connect**.  
16. Press **Deploy Branch**.  
17. Once loaded, go to the tab **Resources**.  
18. Disable **web**, enable **worker**.  
Your bot is ready to work.
