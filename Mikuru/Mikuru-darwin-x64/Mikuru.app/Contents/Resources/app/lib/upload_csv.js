'use strict';

/**
 * Created by shiro on 16-12-26.
 */

var parse = require('csv-parse');
var fs = require('fs');

function upload_csv(name, csv, specs, db, callback) {
  /**
   *
   * with name is the collection name
   * csv is csv file
   * label is the label file, if it is undifined
   * we should use the label column in csv file
   * timestamp is as same as label.
   * @param name the name in the mongodb.
   * @param csv the file name of csv file.
   * @param specs some special files, e.m., timestamp, label or more
   */
  console.log("upload_csv(" + name + ',' + csv + ',' + JSON.stringify(specs) + ')');
  var csv_col = [];
  var setting = {};
  var index = 0;
  var own_specs = {};
  var collection = {};

  function setting_update(setting, timestamp) {
    if (setting.timestamps == null) setting.timestamps = [];
    if (timestamp != null) {
      if (setting.global_max == null) setting.global_max = timestamp;
      if (timestamp > setting.global_max) setting.global_max = timestamp;
      if (setting.global_min == null) setting.global_min = timestamp;
      if (timestamp < setting.global_min) setting.global_min = timestamp;
      if (setting.timestamps.length < 100) setting.timestamps.push(timestamp);
    }
  }

  var parser = parse({
    columns: true
  }).on('readable', function () {
    var row = void 0;
    while (row = parser.read()) {
      for (var col in row) {
        if (index <= 0) for (var id in specs) {
          if (row[id] != null) own_specs[id] = true;
        }if (!(col in specs)) {
          (function () {
            if (index <= 0) {
              console.log("Drop the collection " + name + '@' + col);
              collection[name + "@" + col] = db.getCollection(name + "@" + col).then(function (collection) {
                return collection.create();
              }).then(function (collection) {
                return collection.drop();
              });
              csv_col.push(col);
            }

            var data = {
              index: index,
              value: parseFloat(row[col])
            };
            for (var _id in specs) {
              data[_id] = row[_id] == null ? null : parseInt(row[_id]);
            }if (data.timestamp == null && specs.timestamp == null) data.timestamp = index;

            if (data.timestamp != null) {
              if (setting[name + '@' + col] == null) setting[name + '@' + col] = {};
              setting_update(setting[name + '@' + col], data.timestamp);
            }

            collection[name + '@' + col] = collection[name + '@' + col].then(function (collection) {
              return collection.insertOne(data);
            });
          })();
        }
      }
      ++index;
    }
  }).on('end', function () {
    function build_setting() {
      /**
       *
       * Build the setting for collections
       * in the list `csv_col` with their names
       * are `name + "-" + csv_col[i]`
       * random choose two timestamp
       * and then figure out the gcd of all
       * pair in the list, we should selewct sqrt(n)
       * pairs which n is the number of collection
       */
      for (var col in csv_col) {
        (function (colname) {
          console.log('Random items');
          var items = setting[name + '@' + colname].timestamps;
          var max = setting[name + '@' + colname].global_max;
          var min = setting[name + '@' + colname].global_min;
          var step = void 0;
          for (var i = 0; i < items.length; ++i) {
            var _loop = function _loop(j) {
              var tmp = Math.abs(items[i] - items[j]);

              function gcd(m, n) {
                if (n) return gcd(n, m % n);
                return m;
              }

              step = step == null ? tmp : gcd(tmp, step);
            };

            for (var j = 0; j < items.length; ++j) {
              _loop(j);
            }
          }console.log("Setting");
          console.log(JSON.stringify({
            name: name,
            kpi: colname,
            global_max: max,
            global_min: min,
            step: step
          }));
          db.insertSetting({
            name: name,
            kpi: colname,
            global_max: max,
            global_min: min,
            step: step
          });
          console.log('Setting mc close');
        })(csv_col[col]);
      }
    }

    console.log('End csv ' + csv);

    var proclist = [];

    var _loop2 = function _loop2(id) {
      if (specs[id] != null && !own_specs[id]) {
        proclist.push(new Promise(function (resolve, reject) {
          (function (id, spec) {
            var index = 0;
            console.log('Read spec csv ' + spec);
            var parser = parse({
              columns: true
            }).on('readable', function () {
              var row = void 0;
              while (row = parser.read()) {
                var set = {};
                set[id] = row[id] == null ? null : parseInt(row[id]);
                (function (set, index) {
                  for (var col in csv_col) {
                    //TODO here
                    // Why if there is a `update` action, the process npm &
                    // mongodb will use the 100% CPU ?
                    collection[name + "@" + csv_col[col]].then(function (collection) {
                      return collection.updateOne({
                        index: index
                      }, set);
                    });
                    if (id == 'timestamp') {
                      if (setting[name + '@' + csv_col[col]] == null) setting[name + '@' + csv_col[col]] = {};
                      setting_update(setting[name + '@' + csv_col[col]], row.timestamp);
                    }
                  }
                })(set, index);
                ++index;
              }
            }).on('end', function () {
              console.log('End spec csv ' + spec);
              resolve();
            }).on('error', function (error) {
              console.log('csv-parse Error');
              console.log(error);
            });
            var input = fs.createReadStream(spec);
            input.pipe(parser);
          })(id, specs[id]);
        }));
      }
    };

    for (var id in specs) {
      _loop2(id);
    }Promise.all(proclist).then(function () {
      build_setting();
      callback();
    });
  }).on('error', function (error) {
    console.log('csv-parse Error');
    console.log(error);
  });
  var input = fs.createReadStream(csv);
  input.pipe(parser);
}

module.exports = upload_csv;