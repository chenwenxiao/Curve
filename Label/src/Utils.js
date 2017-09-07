/**
 * Created by shiro on 17-2-20.
 */
// Initialize the constant of time, i.e, _minue, _hour, _day, _week, _month,
// _year. The unit of time is millisecond.
let _minute = 1000 * 60;
let _hour = 1000 * 60 * 60;
let _day = 1000 * 60 * 60 * 24;
let _week = 1000 * 60 * 60 * 24 * 7;
let _month = 1000 * 60 * 60 * 24 * 30;
let _year = 1000 * 60 * 60 * 24 * 365;
let INF = 1e20;
// Utils that could help we manager the data about generate the zones of a
// graph which need to be rendered.
let utils = {
  judgeState: function (states, anomaly) {
    let last = states[2];
    if (states[3])
      last = last + 2 * states[3];
    last = Math.max(0, Math.min(3, last));
    if (!anomaly) last = last % 2;
    return last
  },
  judgePlotLine: function (labels,
                           start,
                           end) {
    let l = utils.binarySearch(labels, start);
    let sum = 0;
    let count = 0;
    for (let i = l; i < labels.length; ++i) {
      if (labels[i][0] > end)
        break;
      count += 1;
      sum += labels[i][1];
    }
    let mean = count > 0 ? sum / count : 0;
    let sita = 0;
    sum = 0;
    for (let i = l; i < labels.length; ++i) {
      if (labels[i][0] > end)
        break;
      sum += (labels[i][1] - mean) * (labels[i][1] - mean);
    }
    sita = count > 0 ? Math.sqrt(sum / count) : 0;
    return [mean, mean - sita, mean + sita];
  },
  binarySearch: function (data, dest) {
    //find the smallest index in data whose value is large or equal than dest
    let h = data.length - 1, l = 0;
    if (dest > data[h][0] || dest > data[h].x)
      return h + 1;
    while (l < h) {
      let m = Math.floor((h + l) / 2);
      if (data[m] == null)
        console.log(m, data);
      if (dest > data[m][0] || dest > data[m].x) {
        l = m + 1;
      } else {
        h = m;
      }
    }
    return l;
  },
  judgeExtremeType: function (min, max) {
    //judge the extrme type, including day, week, month. year
    let size = max - min;
    if (size <= _day)
      return 'day';
    else if (size <= _week)
      return 'week';
    else if (size <= _month)
      return 'month';
    else
      return 'year';
  },
  judgeStep: function (unit,
                       size,
                       nums,
                       global = false) {
    let step = unit;
    if (global) nums = 1;
    while (size / step * nums > 3000) {
      step = step * 2;
    }
    return step;
  },
  sampling: function(labels, shift, nums,
    cache = null, start = null, end = null, strict = false) {
    if (start == null)
      start = 0;
    else
      start = utils.binarySearch(labels, start);

    if (end == null)
      end = labels.length - 1;
    else
      end = utils.binarySearch(labels, end);

    width = Math.round((end - start) / 2);
    expand_start = Math.max(0, start - width);
    expand_end = Math.min(labels.length - 1, end + width);

    let step = utils.judgeStep(1, expand_end - expand_start, nums);

    if (cache != null) {
      // Check the cache, if the [start, end] of cache include current
      // [start, end] and the step of cache is less or equal to current step,
      // return the sample of cache, otherwise, sampling from the raw data.
      // If strict is true, anyway, we will sampling from the raw data.
      if (!strict)
        if (start >= cache.start && end <= cache.end && step >= cache.step)
          return cache;
    }

    sample = [];
    for (let i = expand_start; i <= expand_end; i += step) {
      sample.push(labels[i])
    }
    return {
      sample: sample,
      step: step,
      start: expand_start,
      end: expand_end
    };
  }
};
module.exports = utils;
