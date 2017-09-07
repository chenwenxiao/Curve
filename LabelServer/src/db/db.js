'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Collection = require('./collection');

/**
 * The abstract class `Db` is for hiding the operate of multiple databases' API,
 * i.e, mongodb, mysql or the binary sql for the release desktop version Curve.
 * @abstract
 */

var Db = function () {
  /**
   * Build a db for query, you could override this function to load more
   * parameters.
   * @constructor Build an db instance for query the setting or tables.
   * @abstract
   */
  function Db() {
    _classCallCheck(this, Db);
  }

  /**
   * Get the list of collections or tables in current database.
   * @function getCollectionList.
   * @return {array} - Return the list of collections or table of current.
   * database. Always the element of the list is string.
   * @abstract
   */


  _createClass(Db, [{
    key: 'getCollectionList',
    value: function getCollectionList() {}

    /**
     * Get the collection or table belong to current database. You should
     * override this function to return the custom collection or table class
     * for your database.
     * @function getCollection
     * @param {string} col_name - The name of collection or table.
     * @return {Collection} - Return the collection or table.
     * @abstract
     */

  }, {
    key: 'getCollection',
    value: function getCollection(col_name) {
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

  }, {
    key: 'getSetting',
    value: function getSetting(col_name) {}

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

  }, {
    key: 'getSettings',
    value: function getSettings() {}

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

  }, {
    key: 'insertSetting',
    value: function insertSetting(setting) {}

    /**
     * Destroy current database and release the connection.
     * @function destroy.
     */

  }, {
    key: 'destroy',
    value: function destroy() {}

    //TODO
    // More abstract method

  }]);

  return Db;
}();

module.exports = Db;
