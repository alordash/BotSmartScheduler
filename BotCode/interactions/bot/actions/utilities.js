const { Languages } = require('../static/replies/repliesLoader');

/**
 * @param {Number} id 
 * @returns {String} 
 */
function FormatChatId(id) {
   id = id.toString(10);
   if (id[0] == '-') {
      id = '_' + id.substring(1);
   }
   return id;
}

/**
 * @param {String} string
 * @returns {Languages}
 */
function DetermineLanguage(string) {
   let ruCount = [...string.matchAll(/[А-Яа-я]/g)].length;
   let enCount = [...string.matchAll(/[A-Za-z]/g)].length;
   let result = null;
   if (ruCount > enCount) {
      result = Languages.ru;
   } else if (enCount > ruCount) {
      result = Languages.en;
   }
   return result;
}

/**
 * @param {Array.<Number>} tz 
 * @param {Array.<Number>} trello 
 * @param {Number} id 
 */
function ClearPendingConfirmation(tzs, trellos, id) {
   let index = tzs.indexOf(id)
   if (index >= 0) {
      tzs.splice(index, 1);
   }
   index = trellos.indexOf(id);
   if (index >= 0) {
      trellos.splice(index, 1);
   }
}

/**
 * @param {String} chatID 
 * @param {Array.<{s: String, chatID: String}>} deletingIDs 
 * @returns {Number}
 */
function GetDeletingIDsIndex(chatID, deletingIDs) {
   if (deletingIDs.length) {
      for (let i in deletingIDs) {
         if (deletingIDs[i].chatID == chatID) {
            return i;
         }
      }
   }
   return false;
}

/**@returns {String} */
function GetAttachmentId(message) {
   if (typeof (message.document) != 'undefined') {
      return message.document.file_id;
   } else if (typeof (message.video) != 'undefined') {
      return message.video.file_id;
   } else if (typeof (message.photo) != 'undefined' && message.photo.length > 0) {
      let photoes = message.photo;
      let file_id = photoes[0].file_id;
      let file_size = photoes[0].file_size;
      for (let i = 1; i < photoes.length; i++) {
         const photo = photoes[i];
         if (photo.file_size > file_size) {
            file_size = photo.file_size;
            file_id = photo.file_id;
         }
      }
      return file_id;
   }
   return '~';
}

module.exports = {
   FormatChatId,
   DetermineLanguage,
   ClearPendingConfirmation,
   GetDeletingIDsIndex,
   GetAttachmentId
}