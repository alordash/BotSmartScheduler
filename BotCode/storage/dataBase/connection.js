const { Pool } = require('pg');

class DataBaseOptions {
   /**@type {String} */
   user;
   /**@type {String} */
   host;
   /**@type {String} */
   dataBasePath;
   /**@type {String} */
   password;
   /**@type {Number} */
   port;
   /**@type {Object} */
   ssl;
}

class DataBase {
   /**@type {Pool} */
   pool;
   /**@type {Boolean} */
   sending;

   constructor(options) {
      this.pool = new Pool(options);
      this.sending = false;
   }

   async Query(query) {
      const client = await this.pool.connect();
      let res;
      try {
         res = await client.query(query);
      } catch (err) {
         console.error(err.stack);
      } finally {
         client.release();
         return res;
      }
   }

   async paramQuery(query, values) {
      const client = await this.pool.connect();
      let res;
      try {
         res = await client.query({
            rowMode: 'array',
            text: query,
            values
         });
      } catch (err) {
         console.error(err.stack);
      } finally {
         client.release();
         return res;
      }
   }

   /**@type {DataBase} */
   static instance;

   static get instance() {
      if (typeof (this.instance) == 'undefined') {
         throw "Data base connection wasn't initialized before call";
      }
      return this.instance;
   }

   /**
    * @param {DataBaseOptions} options 
    */
   static Instantiate(options) {
      this.instance = new DataBase(options);
   }
}

module.exports = {
   DataBaseOptions,
   DataBase
};