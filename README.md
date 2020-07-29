# Bot Smart Scheduler

Если вам нужно быстро и с удобством планировать свои задачи, бот Smart Scheduler станет незаменимым инструментом в этом деле.

![Пример использования](https://raw.githubusercontent.com/alordash/BotSmartScheduler/master/UsageExample.png)

## Как использовать

[Бот Smart Scheduler работает в Telegram.](https://t.me/SmartScheduler_bot)
Просто напишите задачу и требуемое время, а Smart Scheduler автоматически найдет дату и задачу в сообщении.
По истечению времени запланированной задачи бот Smart Scheduler пришлет вам уведомление.

Данный бот распознает большинство форм представления даты человеком (например «через X минут», «без пятнадцати десять», «послезавтра пол первого»), поэтому вам не нужно следовать определенному формату времени.

## Особенности

Smart Scheduler способен записывать время с точностью до минуты.
Smart Scheduler хранит для каждого чата задачи раздельно и может функционировать в беседах.

### Поддерживаемые комманды:

- 🗓 **/list** - Показывает активные задачи для данного чата.

- 🗑 **/del** _1, 2, ...N_ - Удаляет задачи по id.

- 🗑 **/del** _1-10, A-B_ - Удаляет задачи в введенном диапазоне.

- #️⃣ **_/N_** - Удаляет N-ную задачу.

- 🌐 **_/tz_** - Настройка часового пояса.

и конечно же /start и /help.

### На данный момент бот распознает написанное только на русском языке время.

# English

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

### Currently bot recognizes the time written only in Russian.
