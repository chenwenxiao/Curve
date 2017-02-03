/**
 * Created by shiro on 10/01/2017.
 */

let Collection = require('./collection');
let multiple = require('../../config').multiple;

/**
 * The class `MysqlCollection` is for hiding the operate of mysql
 * databases' collection or table's API. MysqlCollection provide
 * `getDocs`, `getAll`, `markInterval`, `insertOne`, `insertMany` for the user.
 */
class MysqlCollection extends Collection {
  /**
   * Build the collection instance for query the data of the specific
   * collection or table with name `col_name`.
   * @constructor Build a collection for query data.
   * @param {string} collectionName - The name of collection or table.
   * @param {Object} db - The database connect to the mysqldb. You should
   * promise that the connection is stable connected and when you call the
   * constructor of MysqlCollection, the connection building is finished.
   */
  constructor(collectionName, db) {
    super(collectionName, db);
    if (collectionName.indexOf("@") >= 0) {
      this.collectionName = collectionName.split("@")[0];
      this.kpi = collectionName.split("@")[1];
    } else {
      this.collectionName = collectionName;
      this.kpi = "";
    }
    this.map = {
      'index': 'idx',
      'timestamp': 'timedata',
      'label': 'is_abnormal',
      'value': 'value',
      'kpi': 'kpi'
    };
    this.inv_map = {};
    for (let o in this.map)
      this.inv_map[this.map[o]] = o;
    this.db = db;
  }

  /**
   * Get the transformed object from `doc`, whose field is inv_map.
   * @function
   * @param {object} doc - the data store in database.
   * @returns {object} doc - the data in memory, whose field is in map.
   */
  get_imap(doc) {
    let tmp = {};
    for (let o in doc)
      if (this.inv_map[o] != null)
        tmp[this.inv_map[o]] = doc[o];
      else
        tmp[o] = doc[o];
    return tmp;
  }

  /**
   * Get the transformed object from `doc`, whose field is map.
   * @function
   * @param {object} doc - the data store in memory.
   * @returns {object} doc - the data in database, whose field is in inv_map.
   */
  get_map(doc) {
    let tmp = {}
    for (let o in doc)
      if (this.map[o] != null)
        tmp[this.map[o]] = doc[o];
      else
        tmp[o] = doc[o];
    return tmp;

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
  getDocs(start, end, step, shift, global_min, download) {
    let MysqlCollection = this;
    let residual = (global_min + step - (shift % step)) % step;
    if (residual < 0)
      residual += step;
    return new Promise(function (resolve, reject) {
      let sql = "select * from " + '`' + MysqlCollection.collectionName + '`';
      sql += " where ";
      if (download)
        sql += MysqlCollection.map['timestamp'] +
          " mod " + step + " = " + residual + " and ";
      sql += MysqlCollection.map['timestamp'] + " <= " + end;
      sql += " and " + MysqlCollection.map['timestamp'] + " >= " + start;
      if (MysqlCollection.kpi)
        sql += " and " + MysqlCollection.map['kpi'] + " = " + "'" + MysqlCollection.kpi + "'";
      sql += " order by " + MysqlCollection.map['timestamp'];
      console.log(sql);
      MysqlCollection.db.query(sql, function (err, rows, fields) {
        let labels = [];
        for (let i = 0; i < rows.length; ++i) {
          let tmp = MysqlCollection.get_imap(rows[i]);
          labels.push([(parseInt(tmp.timestamp) + shift) * multiple, parseFloat(tmp.value), tmp.label == null ? 0 : (tmp.label ? 1 : 0)]);
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
  getAll() {
    let MysqlCollection = this;
    return new Promise(function (resolve, reject) {
      let sql = "select * from " + '`' + MysqlCollection.collectionName + '`';
      if (MysqlCollection.kpi)
        sql += " where " + MysqlCollection.map['timestamp'] + " = " + "'" + MysqlCollection.kpi + "'";
      console.log(sql);
      MysqlCollection.db.query(sql,
        function (err, items, fields) {
          resolve(items);
        })
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
  markInterval(start, end, op) {
    let MysqlCollection = this;

    if (op == 'true' || op == true)
      op = 1;
    else if (op == 'false' || op == false)
      op = 0;

    let sql = "update " + '`' + MysqlCollection.collectionName + '`';
    sql += " set ";
    sql += MysqlCollection.map['label'] + " = " + op + " ";
    sql += " where " + MysqlCollection.map['timestamp'] + " >= " + start + " ";
    sql += " and " + MysqlCollection.map['timestamp'] + " <= " + end + " ";
    if (MysqlCollection.kpi)
      sql += " and " + MysqlCollection.map['kpi']
        + " = " + "'" + MysqlCollection.kpi + "'";
    return new Promise(function (resolve, reject) {
      console.log(sql);
      MysqlCollection.db.query(sql, function (err, result) {
        if (err)
          reject(MysqlCollection);
        else
          resolve(MysqlCollection);
      })
    })
  }


  /**
   * Insert one record `doc` into the current collection or table.
   * @function insertOne.
   * @param {Object} doc - A object that include the data of a record that
   * should be insert into the table.
   */
  insertOne(doc) {
    let MysqlCollection = this;

    let sql = "insert into " + '`' + MysqlCollection.collectionName + '`';
    if (doc.kpi == null && MysqlCollection.kpi)
      doc.kpi = MysqlCollection.kpi;
    sql += " set ";
    sql += MysqlCollection.docToString(doc);

    return new Promise(function (resolve, reject) {
      console.log(sql);
      MysqlCollection.db.query(sql, function (err, result) {
        if (err) {
          console.log(err);
          reject(MysqlCollection);
        } else
          resolve(MysqlCollection);
      })
    });
  }

  /**
   * Insert many records `docs` into the current collection or table.
   * @function insertMany.
   * @param {Array.<Object>} docs - A list of objects that each one include
   * the data of a record that should be insert into the table.
   */
  insertMany(docs) {
    let MysqlCollection = this;
    let proclist = [];
    for (let r in rows)
      proclist.push(MysqlCollection.insertOne(rows[r]));
    return Promise.all(proclist).then(() => MysqlCollection);
  }

  /**
   * Update one record 'doc` into the current collection or table.
   * @functino updateOne.
   * @param {Object} doc - A object that include the data of a record that
   * should be updated into the table. It's for searching the doc in the table.
   * @param {Object} set - After find the one record, try to set new value
   * to the doc.
   */
  updateOne(doc, set) {
    // TODO here
    // Why if there is a `update` action, the process npm &
    // mysqldb will use the 100% CPU ?

    let MysqlCollection = this;
    let sql = "update " + '`' + MysqlCollection.collectionName + '`';
    if (doc.kpi == null && MysqlCollection.kpi)
      doc.kpi = MysqlCollection.kpi;
    sql += " set ";
    sql += MysqlCollection.docToString(set);
    sql += " where ";
    sql += MysqlCollection.docToString(doc, "and");
    sql += " limit 1";
    return new Promise(function (resolve, reject) {
      console.log(sql);
      MysqlCollection.db.query(sql, function (err, result) {
        if (err)
          reject(MysqlCollection);
        else
          resolve(MysqlCollection);
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
  updateMany(doc, set) {

    let MysqlCollection = this;
    let sql = "update " + '`' + MysqlCollection.collectionName + '`';
    if (doc.kpi == null && MysqlCollection.kpi)
      doc.kpi = MysqlCollection.kpi;
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
        if (err)
          reject(MysqlCollection);
        else
          resolve(MysqlCollection);
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
  deleteOne(doc) {
    // TODO here
    // Why if there is a `delete` action, the process npm &
    // mysqldb will use the 100% CPU ?

    let MysqlCollection = this;
    let sql = "delete from " + '`' + MysqlCollection.collectionName + '`';
    if (doc.kpi == null && MysqlCollection.kpi)
      doc.kpi = MysqlCollection.kpi;
    sql += " where ";
    sql += MysqlCollection.docToString(doc, "and");
    sql += " limit 1";
    return new Promise(function (resolve, reject) {
      console.log(sql);
      MysqlCollection.db.query(sql, function (err, result) {
        if (err)
          reject(MysqlCollection);
        else
          resolve(MysqlCollection);
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
  deleteMany(doc) {

    let MysqlCollection = this;
    let sql = "delete from " + '`' + MysqlCollection.collectionName + '`';
    if (doc.kpi == null && MysqlCollection.kpi)
      doc.kpi = MysqlCollection.kpi;
    sql += " where ";
    sql += MysqlCollection.docToString(doc, "and");
    // The difference between deleteOne and deleteMany is in this line.
    // In deleteOne, it give the 'limit 1' to limit the records we can delete,
    // but here not.
    return new Promise(function (resolve, reject) {
      console.log(sql);
      MysqlCollection.db.query(sql, function (err, result) {
        if (err)
          reject(MysqlCollection);
        else
          resolve(MysqlCollection);
      });
    });
  }

  /**
   * Drop the collection.
   * @function drop
   */
  drop() {
    let MysqlCollection = this;
    let sql = "delete from " + '`' + MysqlCollection.collectionName + '`';
    if (MysqlCollection.kpi)
      sql += " where " + " `kpi` " + " = " + "'" + MysqlCollection.kpi + "'";
    return new Promise(function (resolve, reject) {
      console.log(sql);
      MysqlCollection.db.query(sql, function (err, result) {
        if (err)
          reject(MysqlCollection);
        else
          resolve(MysqlCollection);
      });
    })
  }

  /**
   * Create the colleciton. If there is no table can use, we will create one
   * new.
   * @param {Object} doc - An class that can indicate the columns of this table.
   */
  create(doc) {

    let MysqlCollection = this;
    let sql = "create table if not exists " +
      '`' + MysqlCollection.collectionName + '`' + " ";
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
        if (err)
          reject(MysqlCollection);
        else
          resolve(MysqlCollection);
      });
    })
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
  docToString(doc, split = ",") {
    doc = this.get_map(doc);
    let sql = "";
    let first = true;
    for (let o in doc) {
      let quota = (typeof doc[o] == "string" ) ? "'" : "";
      sql += " " + (first ? " " : split) + " " + "`" + o + "`" +
        " = " + quota + doc[o] + quota + " ";
      if (first) first = false
    }
    return sql
  }
}

module.exports = MysqlCollection;
