# Bot Smart Scheduler

## Links

- [Версия на русском языке](README.md)

## Currently bot recognizes the time written only in Russian.

If you need fast and handy tool to schedule your plans, Smart Scheduler Bot is the right choice.

## How to use

[Smart Scheduler Bot works in Telegram.](https://t.me/SmartScheduler_bot)
Just type task with required expiration time and Smart Scheduler will automatically find scheduling date and what task to schedule in your message.
Smart Scheduler will send you notification when particular task's time expires.

You do not need to follow specified date format, Smart Scheduler understands most of human date formats (e.g. «через X минут», «без пятнадцати десять», «послезавтра пол первого»).
_Smart Scheduler can store tasks with minute precision._

## Features

Smart Scheduler stores tasks **separately** for every chat and can work in conversations.

Supported commands:

- 🗓 **/list** - Shows active tasks for current chat.

- 🗑 **/del** _1, 2, ...N_ - Deletes tasks by id.

- 🗑 **/del** _1-10, A-B_ - Deletes all tasks within range.

- #️⃣ **_/N_** - Deletes N-th task.

- 🌐 **_/tz_** - Configures time zone.

and /start with /help of course.
