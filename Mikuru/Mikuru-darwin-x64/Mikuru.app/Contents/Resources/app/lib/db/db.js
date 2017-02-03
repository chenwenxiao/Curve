let Collection = require('./collection');

/**
 * The abstract class `Db` is for hiding the operate of multiple databases' API,
 * i.e, mongodb, mysql or the binary sql for the release desktop version Mikuru.
 * @abstract
 */
class Db {
  /**
   * Build a db for query, you could override this function to load more
   * parameters.
   * @constructor Build an db instance for query the setting or tables.
   * @abstract
   */
  constructor() {

  }

  /**
   * Get the list of collections or tables in current database.
   * @function getCollectionList.
   * @return {array} - Return the list of collections or table of current.
   * database. Always the element of the list is string.
   * @abstract
   */
  getCollectionList() {

  }

  /**
   * Get the collection or table belong to current database. You should
   * override this function to return the custom collection or table class
   * for your database.
   * @function getCollection
   * @param {string} col_name - The name of collection or table.
   * @return {Collection} - Return the collection or table.
   * @abstract
   */
  getCollection(col_name) {
    return new Collection(col_name);
  }

  /**
   * Get the setting of table `col_name` in current database. The setting.
   * class always include global_min, global_max, step.
   * @function getSetting.
   * @param {string} col_name - The collection or table name.
   * @return {Object} - A Object present the setting.
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
  getSetting(col_name) {

  }

  /**
   * Get all the settings of the database. The setting class always include
   * `global_min`, `global_max`, `step`.
   * @function getSettings.
   * @return {Array<Object>} - A Object present the setting, string
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

  }

  /**
   * Destroy current database and release the connection.
   * @function destroy.
   */
  destroy() {

  }

  //TODO
  // More abstract method
}

module.exports = Db;