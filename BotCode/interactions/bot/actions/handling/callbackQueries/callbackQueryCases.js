const fs = require('fs');
const path = require('path');

const fileStart = 'case_';

class CallbackQueryCase {
   /**@type {String} */
   name;
   /**@type {Function} */
   callback;

   /**
    * @param {String} name 
    * @param {Function} callback 
    */
   constructor(name, callback) {
      this.name = name;
      this.callback = callback;
   }
}

/**@type {Array.<CallbackQueryCase>} */
let CallbackQueryCases = [];

(function LoadQueryCases() {
   console.log('callbackQueries __dirname :>> ', __dirname);
   let callbackQueryFiles = fs.readdirSync(__dirname);
   console.log('callbackQueryFiles :>> ', callbackQueryFiles);
   for (const filename of callbackQueryFiles) {
      if (path.extname(filename) == '.js'
         && filename.startsWith(fileStart)) {
         let name = filename.substring(fileStart.length).slice(0, -3);
         let callback = require(`./${filename}`);
         CallbackQueryCases.push(new CallbackQueryCase(name, callback));
      }
   }
})();

module.exports = CallbackQueryCases;