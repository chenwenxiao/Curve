/**
 * Created by shiro on 2017/2/19.
 */
import FileSaver from 'file-saver';

function export_csv(arr, filename) {
  let kpi = 'value';
  if (filename.indexOf('@') >= 0) {
    let tmp = filename.split('@');
    filename = tmp[0];
    kpi = tmp[1];
  }
  let result = "";
  result += "timestamp" + "," +
    kpi + "," +
    "label" + "\n";
  for (let i = 0; i < arr.length; ++i) {
    let timestamp = arr[i][0];
    let value = arr[i][1];
    let label = arr[i][2];
    let row = timestamp + "," +
      value + "," +
      label + "\n";
    result += row;
  }
  let blob = new Blob(
    [result], {
      type: "text/plain;charset=utf-8"
    }
  );
  FileSaver.saveAs(blob, filename + ".csv");
}

module.exports = export_csv;