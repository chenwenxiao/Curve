/**
 * Created by shiro on 09/01/2017.
 */

let Collection = require('./collection');
let multiple = require('../../config').multiple;

/**
 * The class `MongoCollection` is for hiding the operate of mongodb
 * databases' collection or table's API. MongoCollection provide
 * `getDocs`, `getAll`, `markInterval`, `insertOne`, `insertMany` for the user.
 */
class MongoCollection extends Collection {
  /**
   * Build the collection instance for query the data of the specific
   * collection or table with name `col_name`.
   * @constructor Build a collection for query data.
   * @param {string} collectionName - The name of collection or table.
   * @param {Object} db - The database connect to the mongodb. You should
   * promise that the connection is stable connected and when you call the
   * constructor of MongoCollection, the connection building is finished.
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
    this.db = db;
    this.col = this.db.collection(this.collectionName);
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
    let MongoCollection = this;
    let residual = (global_min + step - (shift % step)) % step;
    if (residual < 0)
      residual += step;
    return new Promise(function (resolve, reject) {
      let condition = {
        timestamp: {
          $gte: start - shift,
          $lte: end - shift
        }
      };
      if (download)
        condition.timestamp.$mod = [step, residual];
      if (MongoCollection.kpi)
        condition.kpi = MongoCollection.kpi;
      MongoCollection.col.find(condition, {
        sort: {
          timestamp: 1
        }
      }).toArray(function (err, items) {
        // TODO
        // How to support the various multiple of the timestamp. In here,
        // constant 1000 means the unit of timestamp is 1 second in database
        // but the unit of the timestamp is 1 millisecond in frontend.
        let labels = [];
        for (let i = 0; i < items.length; ++i)
          labels.push([(parseInt(items[i].timestamp) + shift) * multiple, parseFloat(items[i].value), items[i].label == null ? 0 : (items[i].label ? 1 : 0)]);
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
    let MongoCollection = this;
    let condition = {};
    if (MongoCollection.kpi)
      condition.kpi = MongoCollection.kpi;
    return new Promise((resolve, reject) => {
      MongoCollection.col.find({}).toArray(function (err, items) {
        resolve(items);
      });
    })
  }

  /**
   * Mark the interval [start, end) with label `op`, no matter with mongodb
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
    let MongoCollection = this;

    if (op == 'true' || op == true)
      op = 1;
    else if (op == 'false' || op == false)
      op = 0;
    let condition = {
      timestamp: {
        $gte: start,
        $lte: end
      }
    };
    if (MongoCollection.kpi)
      condition.kpi = MongoCollection.kpi;
    return MongoCollection.col.updateMany(condition, {
      $set: {
        label: op
      }
    }).then(() => MongoCollection);
  }


  /**
   * Insert one record `doc` into the current collection or table.
   * @function insertOne.
   * @param {Object} doc - A object that include the data of a record that
   * should be insert into the table.
   */
  insertOne(doc) {
    let MongoCollection = this;
    if (doc.kpi == null && MongoCollection.kpi)
      doc.kpi = MongoCollection.kpi;
    console.log((doc));
    return MongoCollection.col.insertOne(doc)
      .catch((err) => {
        console.log(err)
      }).then(() => MongoCollection);
  }

  /**
   * Insert many records `docs` into the current collection or table.
   * @function insertMany.
   * @param {Array.<Object>} docs - A list of objects that each one include
   * the data of a record that should be insert into the table.
   */
  insertMany(docs) {
    let MongoCollection = this;
    let proclist = [];
    for (let r in rows)
      proclist.push(MongoCollection.insertOne(rows[r]));
    return Promise.all(proclist).then(() => MongoCollection);
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
    // mongodb will use the 100% CPU ?

    let MongoCollection = this;
    if (doc.kpi == null && MongoCollection.kpi)
      doc.kpi = MongoCollection.kpi;
    return MongoCollection.col.updateOne(doc, {
      $set: set
    }).then(() => MongoCollection);
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
    let MongoCollection = this;
    if (doc.kpi == null && MongoCollection.kpi)
      doc.kpi = MongoCollection.kpi;
    return MongoCollection.col.updateMany(doc, {
      $set: set
    }).then(() => MongoCollection);
  }

  /**
   * Delete one record 'doc` into the current collection or table.
   * @functino deleteOne.
   * @param {Object} doc - A object that include the data of a record that
   * should be deleted into the table. It's for searching the doc in the table.
   * to the doc.
   */
  deleteOne(doc) {

    let MongoCollection = this;
    if (doc.kpi == null && MongoCollection.kpi)
      doc.kpi = MongoCollection.kpi;
    console.log(doc);
    return MongoCollection.col.deleteOne({
      name: doc.name,
      kpi: doc.kpi
    }).catch((err) => {
      console.log(err);
    }).then(() => {
      return MongoCollection
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
    let MongoCollection = this;
    if (doc.kpi == null && MongoCollection.kpi)
      doc.kpi = MongoCollection.kpi;
    return MongoCollection.col.deleteMany(doc)
      .then(() => MongoCollection);
  }

  /**
   * Drop the collection.
   * @function drop
   */
  drop() {
    let MongoCollection = this;
    return MongoCollection.col.drop()
      .catch((err) => {
        console.log(err)
      }).then(() => MongoCollection)
  }

  /**
   * Create the colleciton. If there is no table can use, we will create one
   * new.
   * @param {Object} doc - An class that can indicate the columns of this table.
   */
  create(doc) {
    let MongoCollection = this;
    // We can do nothing here, because mongodb's collection can be created auto
    // when it's used.
    return Promise.resolve(MongoCollection);
  }
}

module.exports = MongoCollection;
