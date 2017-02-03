let express = require('express');
let os = require('os');
let router = express.Router();
let multiparty = require('multiparty');
let fs = require('fs');
let unzip = require('unzip');
let mc = require('mongodb').MongoClient;
let config = require("../config.js");
let lib_path = "../lib";
if (config.babel)
  lib_path = "../src";


let MongoDb = require(lib_path + '/db/mongo_db');
let MysqlDb = require(lib_path + '/db/mysql_db');
let JsDb = require(lib_path + '/db/js_db');

let mg_path = config.mg_path;
let mysql_option = config.mysql_option;
let multiple = config.multiple;
let db = null;
if (mg_path)
  db = new MongoDb(mg_path);
else if (mysql_option)
  db = new MysqlDb(mysql_option);
else
  db = new JsDb();

let file_info = require(lib_path + '/file_info');
let upload_csv = require(lib_path + '/upload_csv');
let delete_folder = require(lib_path + '/delete_folder');
let mkdirs = require(lib_path + '/mkdirs');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', {title: 'Express'});
});

router.post('/upload', function (req, res, next) {
  let root_path = os.tmpdir() + '/mikuru';
  let tmp_path = root_path + '/tmp';
  let files_path = root_path + '/files';
  mkdirs(tmp_path);
  mkdirs(files_path);
  let form = new multiparty.Form({uploadDir: tmp_path});
  form.parse(req, function (err, fields, files) {
    if (err) {
      console.log("upload error: " + err);
      res.send(500, "upload error: " + JSON.stringify(err));
    } else {
      res.send('Successfully Receive');
      console.log('upload files:');
      console.log(files.file);
      files.file.forEach(function (file) {
        let info = file_info(file.originalFilename);
        let specs = {
          label: null,
          timestamp: null
        };
        if (info.type == 'zip') {
          let uploadPath = file.path;
          let unzipPath = files_path + info.colname;
          delete_folder(unzipPath);
          fs.createReadStream(uploadPath).pipe(unzip.Extract({
            path: unzipPath
          }).on('error', function () {
            console.log('Extract Error');
          }).on('finish', function () {
            console.log('Extract Finish');
            let readDir = fs.readdirSync(unzipPath);
            console.log('Extract Dir is');
            console.log(readDir);
            for (let dir in readDir) {
              console.log(unzipPath + '/' + readDir[dir]);
              if (fs.statSync(unzipPath + '/' + readDir[dir]).isFile()) {
                let finfo = file_info(readDir[dir]);
                if (finfo.type == 'csv')
                  if (finfo.colname in specs)
                    specs[finfo.colname] = unzipPath + '/' + readDir[dir];
              }
            }
            function upload(dir) {
              if (fs.statSync(unzipPath + '/' + readDir[dir]).isFile()) {
                let finfo = file_info(readDir[dir]);
                if (finfo.type == 'csv')
                  if (!(finfo.colname in specs))
                    upload_csv(info.colname + '_' + finfo.colname, unzipPath + '/' + readDir[dir], specs, db, function() {
                      if (dir < readDir.length) upload(dir + 1);
                    });
              }
            }
            if (readDir.length > 0)
              upload(0);
          }))
        } else if (info.type == 'csv') {
          upload_csv(info.colname, file.path, specs, db, function() {

          });
        }
      })
    }
  });
});

router.get('/name', function (req, res) {
  db.getCollectionList().then(function(items) {
    let mg_data = [];
    for (let i = 0; i < items.length; ++i)
      mg_data.push({value: items[i]});
    res.send(JSON.stringify(mg_data));
  })
});

router.get('/label', function (req, res) {
  let name = req.query.name;
  let shift = req.query.shift;
  let start = parseInt(req.query.start);
  let end = parseInt(req.query.end);
  let num = parseInt(req.query.num);
  let download = (req.query.download == "true");
  let mul_shift = 1;
  if (shift.indexOf('d') > 0) {
    shift.replace('d', '');
    mul_shift = 86400 * 1000;
  }
  if (shift.indexOf('h') > 0) {
    shift.replace('h', '');
    mul_shift = 3600 * 1000;
  }
  if (shift.indexOf('m') > 0) {
    shift.replace('m', '');
    mul_shift = 60 * 1000;
  }
  if (shift.indexOf('s') > 0) {
    shift.replace('s', '');
    mul_shift = 1000;
  }
  shift = parseInt(shift) * mul_shift / multiple;
  (function (name, shift, start, end, num) {
    function judgeStep(unit, size, num, global) {
      let step = unit;
      let times = 1500;
      if (global) {
        num = 1;
        times = Math.max(times, size / unit / 7);
      }
      while (size / step * num > times) {
        step = step * 2;
      }
      return step;
    }

    let global = false;
    if (isNaN(start) || isNaN(end))
      global = true;
    if (isNaN(shift))
      shift = 0;

    let data = {
      labels: [],
      global_max: null,
      global_min: null,
      step: null
    };
    shift = Math.round(shift / multiple);
    start = Math.round(start / multiple);
    end = Math.round(end / multiple);
    db.getSetting(name).then(function(setting) {
      data.global_max = setting.global_max;
      data.global_min = setting.global_min;
      data.step = setting.step;
      if (global) {
        end = data.global_max;
        start = data.global_min;
      }
      return judgeStep(data.step, end - start, num, global);
    }).then(function(step) {
      shift = Math.round(shift / data.step) * data.step;
      if (!global) {
        end -= shift;
        start -= shift;
      }
      db.getCollection(name).then(function(col) {
        return col.getDocs(start, end, step, shift, data.global_min, download);
      }).then(function(labels) {
        data.global_max += shift;
        data.global_min += shift;
        data.labels = labels;
        data.global_max *= multiple;
        data.global_min *= multiple;
        data.step *= multiple;
        res.send(JSON.stringify(data));
        console.log(data);
      });
    });
  })(name, shift, start, end, num);
});

router.post('/mark', function (req, res) {
  let name = req.query.name;
  let start = parseInt(req.query.start);
  let end = parseInt(req.query.end);
  let op = req.query.op;
  start /= multiple;
  end /= multiple;
  (function (name, start, end, op) {
    console.log(start, end, op);
    db.getCollection(name).then(function(col) {
      return col.markInterval(start, end, op);
    }).then(function() {
      res.send(JSON.stringify("Successfully"));
    });
  })(name, start, end, op);


});

module.exports = router;
