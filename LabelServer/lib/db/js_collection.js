/**
 * Created by shiro on 10/01/2017.
 */

let Collection = require('./collection');
let multiple = require('../../config').multiple;

/**
 * The class `JsCollection` is for hiding the operate of js
 * databases' collection or table's API. JsCollection provide
 * `getDocs`, `getAll`, `markInterval`, `insertOne`, `insertMany` for the user.
 */
class JsCollection extends Collection {
  /**
   * Build the collection instance for query the data of the specific
   * collection or table with name `col_name`.
   * @constructor Build a collection for query data.
   * @param {string} collectionName - The name of collection or table.
   * @param {Object} db - The database connect to the jsdb. You should
   * promise that the connection is stable connected and when you call the
   * constructor of JsCollection, the connection building is finished.
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
    this.col = db[this.collectionName];
    this.db = db;
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
   * @return {Promise.<Array>} - The list of value whose index in [start start +
   * step, start + 2 * step, ..., start + k * step]. The type of the element of
   * list is always include (float, bool) or (float, int). Remember, the
   * element is a class include `timestamp` and `value`.
   */
  getDocs(start, end, step, shift, global_min) {
    let JsCollection = this;
    let residual = (global_min + step - (shift % step)) % step;
    if (residual < 0)
      residual += step;
    return new Promise(function (resolve, reject) {
      let labels = [];
      for (let i in JsCollection.col) {
        let flag = true;
        flag &= (JsCollection.col[i].timestamp <= end &&
        JsCollection.col[i].timestamp >= start);
        if (JsCollection.kpi)
          flag &= (JsCollection.col[i].kpi == JsCollection.kpi);
        if (flag)
          labels.push(JsCollection.col[i])
      }
      resolve(labels.sort((a, b) => {
        return a.timestamp - b.timestamp;
      }));
    }).then((rows) => {
      let labels = [];
      for (let i = 0; i < rows.length; ++i) {
        let tmp = rows[i];
        labels.push([
          (parseInt(tmp.timestamp) + shift) * multiple,
          parseFloat(tmp.value),
          tmp.label == null ? 0 : (tmp.label ? 1 : 0),
          tmp.anomaly == null ? 0 : (tmp.anomaly ? 1 : 0)
        ]);
      }
      return labels;
    });
  }

  /**
   * Get all the docs in collection or table with no parameter. It will
   * select all the elements.
   * @function getAll.
   * @return {Promise.<Array>} The list of records in the collection.
   */
  getAll() {
    let JsCollection = this;
    return new Promise(function (resolve, reject) {
      let labels = [];
      for (let i in JsCollection.col) {
        let flag = true;
        if (JsCollection.kpi)
          flag &= (JsCollection.col[i].kpi == JsCollection.kpi);
        if (flag)
          labels.push(JsCollection.col[i])
      }
      resolve(labels);
    });
  }

  /**
   * Mark the interval [start, end) with label `op`, no matter with jsdb
   * or js or binary sql. i.e, when (start, end) is (400, 560) with the
   * unit step is 20 in the setting of this table, the data array will be
   * marked in [400, 420, 440, ..., 540].
   * @function markInterval.
   * @param {int} start - left point of the interval that should be marked.
   * @param {int} end - right point of the interval that should be marked.
   * @param {int | bool} op - the label that we use to mark the interval
   * [start, end).
   */
  markInterval(start, end, op) {
    let JsCollection = this;

    if (op == 'true' || op == true)
      op = 1;
    else if (op == 'false' || op == false)
      op = 0;

    return new Promise(function (resolve, reject) {
      for (let i in JsCollection.col) {
        let flag = true;
        flag &= (JsCollection.col[i].timestamp <= end &&
        JsCollection.col[i].timestamp >= start);
        if (JsCollection.kpi)
          flag &= (JsCollection.col[i].kpi == JsCollection.kpi);
        if (flag)
          JsCollection.col[i].label = op;
      }
      resolve(JsCollection);
    })
  }


  /**
   * Insert one record `doc` into the current collection or table.
   * @function insertOne.
   * @param {Object} doc - A object that include the data of a record that
   * should be insert into the table.
   */
  insertOne(doc) {
    let JsCollection = this;

    if (doc.kpi == null && JsCollection.kpi)
      doc.kpi = JsCollection.kpi;

    return new Promise(function (resolve, reject) {
      JsCollection.col.push(doc);
      resolve(JsCollection);
    });
  }

  /**
   * Insert many records `docs` into the current collection or table.
   * @function insertMany.
   * @param {Array.<Object>} docs - A list of objects that each one include
   * the data of a record that should be insert into the table.
   */
  insertMany(docs) {
    let JsCollection = this;
    let proclist = [];
    for (let r in rows)
      proclist.push(JsCollection.insertOne(rows[r]));
    return Promise.all(proclist).then(() => JsCollection);
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
    // jsdb will use the 100% CPU ?

    let JsCollection = this;
    if (doc.kpi == null && JsCollection.kpi)
      doc.kpi = JsCollection.kpi;
    return new Promise(function (resolve, reject) {
      for (let i in JsCollection.col) {
        let flag = true;
        for (let o in doc)
          flag &= (JsCollection.col[i][o] == doc[o]);
        if (JsCollection.kpi)
          flag &= (JsCollection.col[i].kpi == JsCollection.kpi);
        if (flag) {
          for (let o in set)
            JsCollection.col[i][o] = set[o]
          break;
        }
      }
      resolve(JsCollection);
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

    let JsCollection = this;
    if (doc.kpi == null && JsCollection.kpi)
      doc.kpi = JsCollection.kpi;
    // The difference between updateOne and updateMany is in this line.
    // In updateOne, it give the 'limit 1' to limit the records we can update,
    // but here not.
    return new Promise(function (resolve, reject) {
      for (let i in JsCollection.col) {
        let flag = true;
        for (let o in doc)
          flag &= (JsCollection.col[i][o] == doc[o]);
        if (JsCollection.kpi)
          flag &= (JsCollection.col[i].kpi == JsCollection.kpi);
        if (flag) {
          for (let o in set)
            JsCollection.col[i][o] = set[o]
        }
      }
      resolve(JsCollection);
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
    // jsdb will use the 100% CPU ?


    let JsCollection = this;
    if (doc.kpi == null && JsCollection.kpi)
      doc.kpi = JsCollection.kpi;
    return new Promise(function (resolve, reject) {
      for (let i in JsCollection.col) {
        let flag = true;
        for (let o in doc)
          flag &= (JsCollection.col[i][o] == doc[o]);
        if (JsCollection.kpi)
          flag &= (JsCollection.col[i].kpi == JsCollection.kpi);
        if (flag) {
          JsCollection.col.splice(i--, 1);
          break;
        }
      }
      resolve(JsCollection);
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


    let JsCollection = this;
    if (doc.kpi == null && JsCollection.kpi)
      doc.kpi = JsCollection.kpi;
    return new Promise(function (resolve, reject) {
      for (let i in JsCollection.col) {
        let flag = true;
        for (let o in doc)
          flag &= (JsCollection.col[i][o] == doc[o]);
        if (JsCollection.kpi)
          flag &= (JsCollection.col[i].kpi == JsCollection.kpi);
        if (flag) {
          JsCollection.col.splice(i--, 1);
        }
      }
      resolve(JsCollection);
    });
  }

  /**
   * Drop the collection.
   * @function drop
   */
  drop() {
    let JsCollection = this;
    return new Promise(function (resolve, reject) {
      for (let i in JsCollection.col)
        if (JsCollection.col[i].kpi == JsCollection.kpi)
          JsCollection.col.splice(i--, 1);
      resolve(JsCollection);
    })
  }

  /**
   * Create the colleciton. If there is no table can use, we will create one
   * new.
   * @param {Object} doc - An class that can indicate the columns of this table.
   */
  create(doc) {

    let JsCollection = this;
    return new Promise(function (resolve, reject) {
      if (JsCollection.kpi) {
        // I try to use whether the kpi exist to diff current table is or is
        // not a settting table. When it's a setting table, its
        // collectionName should be `__setting__` and its kpi should be empty.
        // Otherwise, kpi must be not empty. Here try to create a table with kpi.
        // TODO
        // We can try to adapt to the variant `doc`, depend on which `doc`
        // include.
        if (!JsCollection.db[JsCollection.collectionName])
          JsCollection.db[JsCollection.collectionName] = [];
      } else {
        // Here try to create a setting file.
        if (!JsCollection.db[JsCollection.collectionName])
          JsCollection.db[JsCollection.collectionName] = [];
      }
      JsCollection.col = JsCollection.db[JsCollection.collectionName];
      resolve(JsCollection);
    })
  }
}

module.exports = JsCollection;
