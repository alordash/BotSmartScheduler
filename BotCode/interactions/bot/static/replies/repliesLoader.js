const Languages = Object.freeze({
    ru: "ru",
    en: "en"
});

/**@param {Languages} language */
function LoadReplies(language = global.defaultUserLanguage) {
    if(language == null || !Languages.hasOwnProperty(language)) {
        language = global.defaultUserLanguage;
    }
    return require(`${__dirname}/${language}.json`);
}

module.exports = {
    Languages,
    LoadReplies
}