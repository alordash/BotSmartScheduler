const Languages = Object.freeze({
    general: "general",
    RU: "ru",
    EN: "en"
});

/**@param {Languages} language */
function LoadReplies(language = global.defaultUserLanguage) {
    if(language == null) {
        language = global.defaultUserLanguage;
    }
    return require(`${__dirname}/${language}.json`);
}

module.exports = {
    Languages,
    LoadReplies
}