const { TrelloManager } = require('@alordash/node-js-trello');

/**
 * @param {String} string 
 * @returns {{nicks: Array.<String>, string: {String}} 
 */
function ExtractNicknames(string) {
    let matches = [...string.matchAll(/@[\w\d_]+/g)];
    for (const i in matches) {
        let match = matches[i];
        string = string.substring(0, match.index) + string.substring(match.index + match[0].length);
        matches[i] = matches[i][0].substring(1);
    }
    string = string.trim()
    return { nicks: matches, string };
}

/**
 * @param {Array.<String>} nicks 
 * @param {TrelloManager} trelloManager 
 * @returns {Array.<String>} 
 */
async function GetUsersIDsFromNicknames(nicks, trelloManager) {
    let ids = [];
    for (const nick of nicks) {
        let user = await trelloManager.GetMember(nick);
        if (typeof (user) != 'undefined') {
            ids.push(user.id);
        }
    }
    return ids;
}

module.exports = {
    ExtractNicknames,
    GetUsersIDsFromNicknames
}