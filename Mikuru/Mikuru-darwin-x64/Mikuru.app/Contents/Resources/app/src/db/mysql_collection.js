'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Created by shiro on 10/01/2017.
 */

var Collection = require('./collection');
var multiple = require('../../config').multiple;

/**
 * The class `MysqlCollection` is for hiding the operate of mysql
 * databases' collection or table's API. MysqlCollection provide
 * `getDocs`, `getAll`, `markInterval`, `insertOne`, `insertMany` for the user.
 */

var MysqlCollection = function (_Collection) {
  _inherits(MysqlCollection, _Collection);

  /**
   * Build the collection instance for query the data of the specific
   * collection or table with name `col_name`.
   * @constructor Build a collection for query data.
   * @param {string} collectionName - The name of collection or table.
   * @param {Object} db - The database connect to the mysqldb. You should
   * promise that the connection is stable connected and when you call the
   * constructor of MysqlCollection, the connection building is finished.
   */
  function MysqlCollection(collectionName, db) {
    _classCallCheck(this, MysqlCollection);

    var _this = _possibleConstructorReturn(this, (MysqlCollection.__proto__ || Object.getPrototypeOf(MysqlCollection)).call(this, collectionName, db));

    if (collectionName.indexOf("@") >= 0) {
      _this.collectionName = collectionName.split("@")[0];
      _this.kpi = collectionName.split("@")[1];
    } else {
      _this.collectionName = collectionName;
      _this.kpi = "";
    }
    _this.map = {
      'index': 'idx',
      'timestamp': 'timedata',
      'label': 'is_abnormal',
      'value': 'value',
      'kpi': 'kpi'
    };
    _this.inv_map = {};
    for (var o in _this.map) {
      _this.inv_map[_this.map[o]] = o;
    }_this.db = db;
    return _this;
  }

  /**
   * Get the transformed object from `doc`, whose field is inv_map.
   * @function
   * @param {object} doc - the data store in database.
   * @returns {object} doc - the data in memory, whose field is in map.
   */


  _createClass(MysqlCollection, [{
    key: 'get_imap',
    value: function get_imap(doc) {
      var tmp = {};
      for (var o in doc) {
        if (this.inv_map[o] != null) tmp[this.inv_map[o]] = doc[o];else tmp[o] = doc[o];
      }return tmp;
    }

    /**
     * Get the transformed object from `doc`, whose field is map.
     * @function
     * @param {object} doc - the data store in memory.
     * @returns {object} doc - the data in database, whose field is in inv_map.
     */

  }, {
    key: 'get_map',
    value: function get_map(doc) {
      var tmp = {};
      for (var o in doc) {
        if (this.map[o] != null) tmp[this.map[o]] = doc[o];else tmp[o] = doc[o];
      }return tmp;
    }

    /**
     * Get the list of value in collection or table with `start`,
     * `end`, and `step`. It will select the elements whose timestamps are
     * in [start, start + step, start + 2 * step, ..., start + k * step] where
     * start + k * step <= end.
     * @function getDocs.
     * @param {int} start - The timestamp start postion.
     * @param {int} end - Time timestamp end postion.
     * @param {int} step - Time timestamp's step in selecting.
     * @param {int} shift - The shift of timestamp mod step.
     * @param {int} global_min - The minimize timestamp in all the series.
     * @param {bool} download - Download means whether download the
     * step-and-step data from the server. If it is false, we will not do
     * down-sample but push all data to client. If it is true, we will use the
     * down-sample.
     * @return {Promise.<Array>} - The list of value whose index in [start start +
     * step, start + 2 * step, ..., start + k * step]. The type of the element of
     * list is always include (float, bool) or (float, int). Remember, the
     * element is a class include `timestamp` and `value`.
     */

  }, {
    key: 'getDocs',
    value: function getDocs(start, end, step, shift, global_min, download) {
      var MysqlCollection = this;
      var residual = (global_min + step - shift % step) % step;
      if (residual < 0) residual += step;
      return new Promise(function (resolve, reject) {
        var sql = "select * from " + '`' + MysqlCollection.collectionName + '`';
        sql += " where ";
        if (download) sql += MysqlCollection.map['timestamp'] + " mod " + step + " = " + residual + " and ";
        sql += MysqlCollection.map['timestamp'] + " <= " + end;
        sql += " and " + MysqlCollection.map['timestamp'] + " >= " + start;
        if (MysqlCollection.kpi) sql += " and " + MysqlCollection.map['kpi'] + " = " + "'" + MysqlCollection.kpi + "'";
        sql += " order by " + MysqlCollection.map['timestamp'];
        console.log(sql);
        MysqlCollection.db.query(sql, function (err, rows, fields) {
          var labels = [];
          for (var i = 0; i < rows.length; ++i) {
            var tmp = MysqlCollection.get_imap(rows[i]);
            labels.push([(parseInt(tmp.timestamp) + shift) * multiple, parseFloat(tmp.value), tmp.label == null ? 0 : tmp.label ? 1 : 0]);
          }
          resolve(labels);
        });
      });
    }

    /**
     * Get all the docs in collection or table with no parameter. It will
     * select all the elements.
     * @function getAll.
     * @return {Promise.<Array>} The list of records in the collection.
     */

  }, {
    key: 'getAll',
    value: function getAll() {
      var MysqlCollection = this;
      return new Promise(function (resolve, reject) {
        var sql = "select * from " + '`' + MysqlCollection.collectionName + '`';
        if (MysqlCollection.kpi) sql += " where " + MysqlCollection.map['timestamp'] + " = " + "'" + MysqlCollection.kpi + "'";
        console.log(sql);
        MysqlCollection.db.query(sql, function (err, items, fields) {
          resolve(items);
        });
      });
    }

    /**
     * Mark the interval [start, end) with label `op`, no matter with mysqldb
     * or mysql or binary sql. i.e, when (start, end) is (400, 560) with the
     * unit step is 20 in the setting of this table, the data array will be
     * marked in [400, 420, 440, ..., 540].
     * @function markInterval.
     * @param {int} start - left point of the interval that should be marked.
     * @param {int} end - right point of the interval that should be marked.
     * @param {int | bool} op - the label that we use to mark the interval
     * [start, end).
     */

  }, {
    key: 'markInterval',
    value: function markInterval(start, end, op) {
      var MysqlCollection = this;

      if (op == 'true' || op == true) op = 1;else if (op == 'false' || op == false) op = 0;

      var sql = "update " + '`' + MysqlCollection.collectionName + '`';
      sql += " set ";
      sql += MysqlCollection.map['label'] + " = " + op + " ";
      sql += " where " + MysqlCollection.map['timestamp'] + " >= " + start + " ";
      sql += " and " + MysqlCollection.map['timestamp'] + " <= " + end + " ";
      if (MysqlCollection.kpi) sql += " and " + MysqlCollection.map['kpi'] + " = " + "'" + MysqlCollection.kpi + "'";
      return new Promise(function (resolve, reject) {
        console.log(sql);
        MysqlCollection.db.query(sql, function (err, result) {
          if (err) reject(MysqlCollection);else resolve(MysqlCollection);
        });
      });
    }

    /**
     * Insert one record `doc` into the current collection or table.
     * @function insertOne.
     * @param {Object} doc - A object that include the data of a record that
     * should be insert into the table.
     */

  }, {
    key: 'insertOne',
    value: function insertOne(doc) {
      var MysqlCollection = this;

      var sql = "insert into " + '`' + MysqlCollection.collectionName + '`';
      if (doc.kpi == null && MysqlCollection.kpi) doc.kpi = MysqlCollection.kpi;
      sql += " set ";
      sql += MysqlCollection.docToString(doc);

      return new Promise(function (resolve, reject) {
        console.log(sql);
        MysqlCollection.db.query(sql, function (err, result) {
          if (err) {
            console.log(err);
            reject(MysqlCollection);
          } else resolve(MysqlCollection);
        });
      });
    }

    /**
     * Insert many records `docs` into the current collection or table.
     * @function insertMany.
     * @param {Array.<Object>} docs - A list of objects that each one include
     * the data of a record that should be insert into the table.
     */

  }, {
    key: 'insertMany',
    value: function insertMany(docs) {
      var MysqlCollection = this;
      var proclist = [];
      for (var r in rows) {
        proclist.push(MysqlCollection.insertOne(rows[r]));
      }return Promise.all(proclist).then(function () {
        return MysqlCollection;
      });
    }

    /**
     * Update one record 'doc` into the current collection or table.
     * @functino updateOne.
     * @param {Object} doc - A object that include the data of a record that
     * should be updated into the table. It's for searching the doc in the table.
     * @param {Object} set - After find the one record, try to set new value
     * to the doc.
     */

  }, {
    key: 'updateOne',
    value: function updateOne(doc, set) {
      // TODO here
      // Why if there is a `update` action, the process npm &
      // mysqldb will use the 100% CPU ?

      var MysqlCollection = this;
      var sql = "update " + '`' + MysqlCollection.collectionName + '`';
      if (doc.kpi == null && MysqlCollection.kpi) doc.kpi = MysqlCollection.kpi;
      sql += " set ";
      sql += MysqlCollection.docToString(set);
      sql += " where ";
      sql += MysqlCollection.docToString(doc, "and");
      sql += " limit 1";
      return new Promise(function (resolve, reject) {
        console.log(sql);
        MysqlCollection.db.query(sql, function (err, result) {
          if (err) reject(MysqlCollection);else resolve(MysqlCollection);
        });
      });
    }

    /**
     * Update many records 'doc` into the current collection or table. The
     * difference between `updateOne` and `updateMany` is the number of
     * records that we can update. In `updateOne`, we can only update one
     * record, even there is more than one satisfied condition. But in
     * `updateMany`, we can update them all.
     * @functino updateOne.
     * @param {Object} doc - A object that include the data of a record that
     * should be updated into the table. It's for searching the doc in the table.
     * @param {Object} set - After find the one record, try to set new value
     * to the doc.
     */

  }, {
    key: 'updateMany',
    value: function updateMany(doc, set) {

      var MysqlCollection = this;
      var sql = "update " + '`' + MysqlCollection.collectionName + '`';
      if (doc.kpi == null && MysqlCollection.kpi) doc.kpi = MysqlCollection.kpi;
      sql += " set ";
      sql += MysqlCollection.docToString(set);
      sql += " where ";
      sql += MysqlCollection.docToString(doc, "and");
      // The difference between updateOne and updateMany is in this line.
      // In updateOne, it give the 'limit 1' to limit the records we can update,
      // but here not.
      return new Promise(function (resolve, reject) {
        console.log(sql);
        MysqlCollection.db.query(sql, function (err, result) {
          if (err) reject(MysqlCollection);else resolve(MysqlCollection);
        });
      });
    }

    /**
     * Delete one record 'doc` into the current collection or table.
     * @functino deleteOne.
     * @param {Object} doc - A object that include the data of a record that
     * should be deleted into the table. It's for searching the doc in the table.
     * to the doc.
     */

  }, {
    key: 'deleteOne',
    value: function deleteOne(doc) {
      // TODO here
      // Why if there is a `delete` action, the process npm &
      // mysqldb will use the 100% CPU ?

      var MysqlCollection = this;
      var sql = "delete from " + '`' + MysqlCollection.collectionName + '`';
      if (doc.kpi == null && MysqlCollection.kpi) doc.kpi = MysqlCollection.kpi;
      sql += " where ";
      sql += MysqlCollection.docToString(doc, "and");
      sql += " limit 1";
      return new Promise(function (resolve, reject) {
        console.log(sql);
        MysqlCollection.db.query(sql, function (err, result) {
          if (err) reject(MysqlCollection);else resolve(MysqlCollection);
        });
      });
    }

    /**
     * Delete many records 'doc` into the current collection or table. The
     * difference between `deleteOne` and `deleteMany` is the number of
     * records that we can delete. In `deleteOne`, we can only delete one
     * record, even there is more than one satisfied condition. But in
     * `deleteMany`, we can delete them all.
     * @functino deleteOne.
     * @param {Object} doc - A object that include the data of a record that
     * should be deleted into the table. It's for searching the doc in the table.
     * to the doc.
     */

  }, {
    key: 'deleteMany',
    value: function deleteMany(doc) {

      var MysqlCollection = this;
      var sql = "delete from " + '`' + MysqlCollection.collectionName + '`';
      if (doc.kpi == null && MysqlCollection.kpi) doc.kpi = MysqlCollection.kpi;
      sql += " where ";
      sql += MysqlCollection.docToString(doc, "and");
      // The difference between deleteOne and deleteMany is in this line.
      // In deleteOne, it give the 'limit 1' to limit the records we can delete,
      // but here not.
      return new Promise(function (resolve, reject) {
        console.log(sql);
        MysqlCollection.db.query(sql, function (err, result) {
          if (err) reject(MysqlCollection);else resolve(MysqlCollection);
        });
      });
    }

    /**
     * Drop the collection.
     * @function drop
     */

  }, {
    key: 'drop',
    value: function drop() {
      var MysqlCollection = this;
      var sql = "delete from " + '`' + MysqlCollection.collectionName + '`';
      if (MysqlCollection.kpi) sql += " where " + " `kpi` " + " = " + "'" + MysqlCollection.kpi + "'";
      return new Promise(function (resolve, reject) {
        console.log(sql);
        MysqlCollection.db.query(sql, function (err, result) {
          if (err) reject(MysqlCollection);else resolve(MysqlCollection);
        });
      });
    }

    /**
     * Create the colleciton. If there is no table can use, we will create one
     * new.
     * @param {Object} doc - An class that can indicate the columns of this table.
     */

  }, {
    key: 'create',
    value: function create(doc) {

      var MysqlCollection = this;
      var sql = "create table if not exists " + '`' + MysqlCollection.collectionName + '`' + " ";
      if (MysqlCollection.kpi) {
        // I try to use whether the kpi exist to diff current table is or is
        // not a settting table. When it's a setting table, its
        // collectionName should be `__setting__` and its kpi should be empty.
        // Otherwise, kpi must be not empty. Here try to create a table with kpi.
        // TODO
        // We can try to adapt to the variant `doc`, depend on which `doc`
        // include.
        sql += "(";
        sql += MysqlCollection.map['index'] + " bigint, ";
        sql += MysqlCollection.map['timestamp'] + " bigint, ";
        sql += MysqlCollection.map['value'] + " double, ";
        sql += MysqlCollection.map['label'] + " int, ";
        sql += MysqlCollection.map['kpi'] + " text";
        sql += ")";
      } else {
        // Here try to create a setting file.
        sql += "(";
        sql += 'global_min' + " bigint, ";
        sql += 'global_max' + " bigint, ";
        sql += 'step' + " bigint, ";
        sql += 'name' + " text, ";
        sql += 'kpi' + " text";
        sql += ")";
      }

      return new Promise(function (resolve, reject) {
        console.log(sql);
        MysqlCollection.db.query(sql, function (err, result) {
          if (err) reject(MysqlCollection);else resolve(MysqlCollection);
        });
      });
    }

    /**
     * Help function, translate a doc into string. I try to use it to help
     * insert, delete or more sql language because they are all receipting a
     * object named `doc` and try to use sql. There must be a necessary method
     * used in them, that's translation from object to sql string.
     * @param doc
     * @param split
     * @returns {string}
     */

  }, {
    key: 'docToString',
    value: function docToString(doc) {
      var split = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ",";

      doc = this.get_map(doc);
      var sql = "";
      var first = true;
      for (var o in doc) {
        var quota = typeof doc[o] == "string" ? "'" : "";
        sql += " " + (first ? " " : split) + " " + "`" + o + "`" + " = " + quota + doc[o] + quota + " ";
        if (first) first = false;
      }
      return sql;
    }
  }]);

  return MysqlCollection;
}(Collection);

module.exports = MysqlCollection;