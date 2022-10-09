const request = require('request');
const utils = require('./interactions/processing/utilities');

let keepAliveUrl = process.env.SMART_SCHEDULER_KEEP_ALIVE_URL;

function startKeepAliveService() {
    console.log("Started keep alive service");
    utils.RepeatActionsWithPeriod(60000, async function () {
        console.log("Sending request to keep alive");
        request.get(keepAliveUrl, undefined, (e, r) => console.log(`KeepAlive response: ${r}, error: ${e}`));
    });
}

module.exports = { startKeepAliveService }