const https = require('https');
const utils = require('./interactions/processing/utilities');

let keepAliveUrl = process.env.SMART_SCHEDULER_KEEP_ALIVE_URL;

function startKeepAliveService() {
    console.log("Started keep alive service");
    utils.RepeatActionsWithPeriod(900000, async function () {
        console.log("Sending request to keep alive");
        https.get(keepAliveUrl, (res) => console.log(`KeepAlive response: ${res}`));
    });
}

module.exports = { startKeepAliveService }