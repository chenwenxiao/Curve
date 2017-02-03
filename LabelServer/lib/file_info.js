'use strict';

/**
 * Created by shiro on 16-12-26.
 */

function file_info(filename) {
  var type = '';
  var colname = '';
  var dotIndex = filename.lastIndexOf('.');
  if (dotIndex >= 0) {
    type = filename.substr(dotIndex + 1);
    colname = filename.substr(0, dotIndex);
  } else {
    type = '';
    colname = filename;
  }

  return {
    type: type,
    colname: colname
  };
}
module.exports = file_info;