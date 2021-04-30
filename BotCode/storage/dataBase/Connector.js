const { Pool } = require('pg');

class ConnectorOptions {
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

class Connector {
   /**@type {Pool} */
   pool;
   /**@type {Boolean} */
   sending;

   /**@param {ConnectorOptions} options */
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

   /**@type {Connector} */
   static instance;

   static get instance() {
      if (typeof (Connector.instance) == 'undefined') {
         throw "Data base connection wasn't initialized before call";
      }
      return Connector.instance;
   }

   static get sending() {
      if (typeof (Connector.instance) == 'undefined') {
         throw "Data base connection wasn't initialized before call";
      }
      return Connector.instance.sending;
   }

   /**@param {Boolean} state */
   static set sending(state) {
      if (typeof (Connector.instance) == 'undefined') {
         throw "Data base connection wasn't initialized before call";
      }
      Connector.instance.sending = state;
   }

   /**
    * @param {ConnectorOptions} options 
    */
   static Instantiate(options) {
      Connector.instance = new Connector(options);
   }
}

module.exports = {
   ConnectorOptions,
   Connector
}