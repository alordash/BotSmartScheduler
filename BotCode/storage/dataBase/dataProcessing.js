/**
 * @param {Number} tz 
 * @returns {Number}
 */
module.exports = function fixTimezone(tz = global.defaultUserTimezone) {
    return tz;
}