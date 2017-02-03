'use strict';

var fs = require('fs');
var path = require('path');

function mkdirs(dir_path) {
  if (fs.existsSync(dir_path)) {
    console.log('Already create ' + dir_path + ' directory');
  } else {
    mkdirs(path.dirname(dir_path));
    fs.mkdirSync(dir_path);
    console.log('Create ' + dir_path + ' directory successfully');
  }
}
module.exports = mkdirs;