const botSubscriptions = require('./botSubscriptions');

exports.InitBot = async function(bot, db) {
    await botSubscriptions.InitActions(bot, db);
    await bot.launch();
};