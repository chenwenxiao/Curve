'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Created by shiro on 10/01/2017.
 */

var Db = require('./db.js');
var MysqlCollection = require('./mysql_collection');
var mysql = require('mysql');
var SETTINGPATH = '__setting__';

/**
 * The class `MysqlDb` is for hiding the operate of mysql databases' API. It's
 * depend on the collection class `MysqlCollection`. MysqlDb provide
 * `getCollectionList`, `getCollection`, `getSetting` for the user.
 */

var MysqlDb = function (_Db) {
  _inherits(MysqlDb, _Db);

  /**
   * Build a db for query, you could override this function to load more
   * parameters.
   * @constructor Build an db instance for query the setting or tables.
   * @abstract
   */
  function MysqlDb(option) {
    _classCallCheck(this, MysqlDb);

    var _this = _possibleConstructorReturn(this, (MysqlDb.__proto__ || Object.getPrototypeOf(MysqlDb)).call(this));

    var defaultOption = {
      connectionLimit: 10,
      host: 'localhost',
      user: 'root',
      password: 'root'
    };
    for (var o in option) {
      defaultOption[o] = option[o];
    }var _MysqlDb = _this;
    var database = defaultOption.database;
    if (!database) database = 'dnn-anomaly';
    delete defaultOption.database;
    _MysqlDb.db = mysql.createPool(defaultOption);
    _MysqlDb.proc = new Promise(function (resolve, reject) {
      _MysqlDb.db.query("create database " + database + " if not exist", function () {
        defaultOption.database = database;
        _MysqlDb.db = mysql.createPool(defaultOption);
        resolve(_MysqlDb);
      });
    });
    return _this;
  }

  /**
   * Get the list of collections or tables in current database.
   * @function getCollectionList.
   * @return {Promise.<Array>} - Return the list of collections or table of
   * current.
   * database. Always the element of the list is string.
   * @abstract
   */


  _createClass(MysqlDb, [{
    key: 'getCollectionList',
    value: function getCollectionList() {
      var MysqlDb = this;
      return this.getSettings().then(function (settings) {
        var list = [];
        for (var s in settings) {
          list.push(settings[s].name + "@" + settings[s].kpi);
        }return list;
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

  }, {
    key: 'getCollection',
    value: function getCollection(collectionName) {
      var MysqlDb = this;
      return MysqlDb.proc.then(function () {
        return new MysqlCollection(collectionName, MysqlDb.db);
      }).then(function (collection) {
        return collection.create(null);
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

  }, {
    key: 'getSetting',
    value: function getSetting(collectionName) {
      var MysqlDb = this;
      return this.getSettings().then(function (settings) {
        for (var s in settings) {
          if (settings[s].name + "@" + settings[s].kpi == collectionName) return settings[s];
        }return null;
      });
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

  }, {
    key: 'getSettings',
    value: function getSettings() {
      var MysqlDb = this;
      return MysqlDb.getCollection(SETTINGPATH).then(function (col) {
        return col.getAll();
      });
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

  }, {
    key: 'insertSetting',
    value: function insertSetting(setting) {
      var MysqlDb = this;
      return MysqlDb.getCollection(SETTINGPATH).then(function (col) {
        col.deleteOne({
          name: setting.name,
          kpi: setting.kpi
        }).then(function () {
          return col.insertOne(setting);
        });
      });
    }

    /**
     * Destroy current database and release the connection.
     * @function destroy.
     * @return {Promise} - Return the promise that closing the connection.
     */

  }, {
    key: 'destroy',
    value: function destroy() {
      var MysqlDb = this;
      // TODO
      // How to close the pool?
      // In `mysql`'s API document, it perhaps could not be closed.
    }

    //TODO
    // More abstract method

  }]);

  return MysqlDb;
}(Db);

module.exports = MysqlDb;