/**
 * Created by shiro on 09/01/2017.
 */

let Db = require('./db.js');
let MongoCollection = require('./mongo_collection');
let mc = require('mongodb').MongoClient;
let SETTINGPATH = 'setting';

/**
 * The class `MongoDb` is for hiding the operate of mongodb databases' API. It's
 * depend on the collection class `MongoCollection`. MongoDb provide
 * `getCollectionList`, `getCollection`, `getSetting` for the user.
 */
class MongoDb extends Db {
  /**
   * Build a db for query, you could override this function to load more
   * parameters.
   * @constructor Build an db instance for query the setting or tables.
   * @abstract
   */
  constructor(dbPath) {
    super();
    let MongoDb = this;
    MongoDb.process = new Promise(function (resolve, reject) {
      mc.connect(dbPath, function (err, db) {
        if (err)
          reject();
        else {
          MongoDb.db = db;
          resolve();
        }
      })
    });
  }

  /**
   * Get the list of collections or tables in current database.
   * @function getCollectionList.
   * @return {Promise.<Array>} - Return the list of collections or table of
   * current.
   * database. Always the element of the list is string.
   * @abstract
   */
  getCollectionList() {
    let MongoDb = this;
    return this.getSettings().then(function (settings) {
      let list = [];
      for (let s in settings)
        list.push(settings[s].name + "@" + settings[s].kpi);
      return list;
    });
  }

  /**
   * Get the collection or table belong to current database. You should
   * override this function to return the custom collection or table class
   * for your database.
   * @function getCollection
   * @param {string} collectionName - The name of collection or table.
   * @return {Promise.<MongoCollection>} - Return the collection or table.
   * @abstract
   */
  getCollection(collectionName) {
    let MongoDb = this;
    return this.process.then(function () {
      return new MongoCollection(collectionName, MongoDb.db);
    });
  }

  /**
   * Get the setting of table `col_name` in current database. The setting
   * class always include `global_min`, `global_max`, `step`.
   * @function getSetting.
   * @param {string} collectionName - The collection or table name.
   * @return {Promise.<Object>} - A Object present the setting.
   * {
   *   {string} name,
   *   {int} global_min,
   *   {int} global_max,
   *   {int} step
   * } - `global_min` present the min timestamp in all the collection or
   * table and `globa_max` present the max timestamp in all the table
   * or collection and `step` is unit step in the table and each adjacent
   * elements' timestamp's minus is equal to `step` or the multiple of `step`.
   */
  getSetting(collectionName) {
    let MongoDb = this;
    return this.getSettings().then(function (settings) {
      for (let s in settings)
        if (settings[s].name + "@" + settings[s].kpi == collectionName)
          return settings[s];
      return null;
    })
  }

  /**
   * Get all the settings of the database. The setting class always include
   * `global_min`, `global_max`, `step`.
   * @function getSettings.
   * @return {Promise.<Array>} - A Object present the setting, string
   * present the name of collection or table. Each element is
   * {
   *   {string} name,
   *   {int} global_min,
   *   {int} global_max,
   *   {int} step
   *   {string} kpi
   * } - `global_min` present the min timestamp in all the collection or
   * table and `global_max` present the max timestamp in all the table
   * or collection and `step` is unit step in the table and each adjacent
   * elements' timestamp's minus is equal to `step` or the multiple of `step`.
   */
  getSettings() {
    let MongoDb = this;
    return MongoDb.getCollection(SETTINGPATH).then(function (col) {
      return col.getAll();
    })
  }

  /**
   * Insert one setting into the setting collection or table of the
   * database. The setting class always include `global_min`, `global_max`,
   * `step`.
   * @function insertSetting.
   * @param {Object} setting - A Object present the setting, string
   * present the name of collection or table. Each element is
   * {
   *   {string} name,
   *   {int} global_min,
   *   {int} global_max,
   *   {int} step
   *   {string} kpi
   * } - `global_min` present the min timestamp in all the collection or
   * table and `global_max` present the max timestamp in all the table
   * or collection and `step` is unit step in the table and each adjacent
   * elements' timestamp's minus is equal to `step` or the multiple of `step`.
   */
  insertSetting(setting) {
    let MongoDb = this;
    return MongoDb.getCollection(SETTINGPATH).then(function (col) {
      col.deleteOne({
        name: setting.name,
        kpi: setting.kpi
      }).then((col) => {
        return col.insertOne(setting);
      });
    })
  }

  /**
   * Destroy current database and release the connection.
   * @function destroy.
   * @return {Promise} - Return the promise that closing the connection.
   */
  destroy() {
    let MongoDb = this;
    return this.process.then(function () {
      MongoDb.close();
    })
  }

  //TODO
  // More abstract method
}

module.exports = MongoDb;