/**
 * Created by shiro on 10/01/2017.
 */

let Db = require('./db.js');
let MysqlCollection = require('./mysql_collection');
let mysql = require('mysql');
let SETTINGPATH = '__setting__';

/**
 * The class `MysqlDb` is for hiding the operate of mysql databases' API. It's
 * depend on the collection class `MysqlCollection`. MysqlDb provide
 * `getCollectionList`, `getCollection`, `getSetting` for the user.
 */
class MysqlDb extends Db {
  /**
   * Build a db for query, you could override this function to load more
   * parameters.
   * @constructor Build an db instance for query the setting or tables.
   * @abstract
   */
  constructor(option) {
    super();
    let defaultOption = {
      connectionLimit: 10,
      host: 'localhost',
      user: 'root',
      password: 'root'
    };
    for (let o in option)
      defaultOption[o] = option[o]
    let MysqlDb = this;
    let database = defaultOption.database;
    if (!database)
      database = 'dnn-anomaly';
    delete defaultOption.database;
    MysqlDb.db = mysql.createPool(defaultOption);
    MysqlDb.proc = new Promise(function (resolve, reject) {
      MysqlDb.db.query("create database " + database + " if not exist", () => {
        defaultOption.database = database;
        MysqlDb.db = mysql.createPool(defaultOption);
        resolve(MysqlDb);
      })
    })
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
    let MysqlDb = this;
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
   * @return {Promise.<MysqlCollection>} - Return the collection or table.
   * @abstract
   */
  getCollection(collectionName) {
    let MysqlDb = this;
    return MysqlDb.proc.then(function () {
      return new MysqlCollection(collectionName, MysqlDb.db);
    }).then((collection) => collection.create(null));
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
    let MysqlDb = this;
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
   *   {int} step,
   *   {string} kpi
   * } - `global_min` present the min timestamp in all the collection or
   * table and `global_max` present the max timestamp in all the table
   * or collection and `step` is unit step in the table and each adjacent
   * elements' timestamp's minus is equal to `step` or the multiple of `step`.
   */
  getSettings() {
    let MysqlDb = this;
    return MysqlDb.getCollection(SETTINGPATH).then(function (col) {
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
   *   {string} name,f
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
    let MysqlDb = this;
    return MysqlDb.getCollection(SETTINGPATH).then(function (col) {
      col.deleteOne({
        name: setting.name,
        kpi: setting.kpi
      }).then(() => {
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
    let MysqlDb = this;
    // TODO
    // How to close the pool?
    // In `mysql`'s API document, it perhaps could not be closed.
  }

//TODO
// More abstract method
}

module.exports = MysqlDb;