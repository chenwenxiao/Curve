<script src="../node_modules/highcharts/highstock.src.js"></script>
<template>
    <div class="container"
         :class="{'show-menu': show_menu}">
        <optionmenu @toggleContainer="toggleContainer"
                    @updateOption="updateOption"
                    ref="menu">

        </optionmenu>
        <div class="content-wrap"
             @click="toggleContent">
            <div class="content">
                <div id="container"
                     style="width:100%;">

                </div>
                <globalbar ref="globalbar"
                           @update="update"/>
                <el-dialog title="上传数据"
                           v-model="upload.visible"
                           size="none">
                    <el-upload action="upload"
                               type="drag"
                               :multiple="true">
                        <i class="el-icon-upload">

                        </i>
                        <div class="el-dragger__text">
                            将文件拖到此处，或
                            <em>
                                点击上传
                            </em>
                        </div>
                        <div class="el-upload__tip"
                             slot="tip">
                            只能上传csv文件，大小不限
                        </div>
                    </el-upload>
                </el-dialog>
                <el-dialog title="数据列表"
                           v-model="series.visible"
                           size="large">
                    <el-form :model="series">
                        <el-form-item v-for="(name, index) in series.names"
                                      :label="'数据' + index"
                                      label-width="80px">
                            <el-row :gutter="20">
                                <el-col :span="12">
                                    <el-autocomplete
                                            v-model="series.names[index]"
                                            :fetch-suggestions="querySearch"
                                            placeholder="请输入数据名称"
                                            :trigger-on-focus="true">
                                    </el-autocomplete>
                                </el-col>
                                <el-col :span="7">
                                    <el-input
                                            placeholder="请输入偏移量（单位s,m,h,d,w,M,y）"
                                            v-model="series.shifts[index]">
                                    </el-input>
                                </el-col>
                                <el-col :span="4">
                                    <el-button @click.prevent="removeSeries(index)">
                                        删除
                                    </el-button>
                                </el-col>
                            </el-row>
                        </el-form-item>
                    </el-form>
                    <div slot="footer"
                         class="dialog-footer">
                        <el-button @click="cancelSeries">
                            取 消
                        </el-button>
                        <el-button @click="addSeries">
                            新增数据
                        </el-button>
                        <el-button type="primary" @click="confirmSeries">
                            确 定
                        </el-button>
                    </div>
                </el-dialog>
            </div>
        </div>
    </div>
</template>
<script>
  import Highcharts from 'highcharts/highstock.src';
  import more from 'highcharts/highcharts-more.src';
  import theme from './theme.js'
  import jquery from 'jquery';
  import GlobalBar from './GlobalBar.vue';
  import Menu from './Menu.vue';
  import theme_grid from './theme_grid.js';
  import keyManager from './KeyManager';
  import exportCsv from './ExportCsv';
  import utils from './Utils';
  import multicolor_series from 'highcharts-multicolor-series';
  multicolor_series(Highcharts);

  // Insert extend type into highcharts
  more(Highcharts);

  // Initialize the constant of time, i.e, _minue, _hour, _day, _week, _month,
  // __year. The unit of time is millisecond.
  let _minute = 1000 * 60;
  let _hour = 1000 * 60 * 60;
  let _day = 1000 * 60 * 60 * 24;
  let _week = 1000 * 60 * 60 * 24 * 7;
  let _month = 1000 * 60 * 60 * 24 * 30;
  let _year = 1000 * 60 * 60 * 24 * 365;
  let INF = 1e20;

  // The offline data, now only containing `sin` and `cos`. In future, we will
  // cache the data in memory if user allow and need it.

  // STORAGE_KEY tne name of key which stores the data in local browser.
  let STORAGE_KEY = 'Curve-2.2.0';
  let labelStorage = {
    rem: {},
    // Get all the name of data set from server if the network is connected and
    // server support it, or from local using the cached data. In current
    // version, we only have `sin` and `cos` in local storage.
    getNames: function (App) {
      return App.$http.get('/name').then(function (res) {
        // Get the name list from server.
        if (typeof res.data == "string")
          return JSON.parse(res.data);
        return res.data;
      }, function (res) {
        // Get the data from local storage.
        return [{
          value: 'sin'
        }, {
          value: 'cos'
        }];
      });
    },

    virtual_get: function (name, index) {
      let y = 0;
      if (name == 'sin')
        y = Math.sin(index * 1.0 / 6000000);
      else if (name == 'cos')
        y = Math.cos(index * 1.0 / 6000000);
      return [index, y, 0];
    },
    fetch: function (App,
                     start = 0,
                     end = 0,
                     strict = false) {
      let LS = this;
      let pros = [];
      if (App.names.length > 0)
        App.$message({
          showClose: true,
          message: '正在获取数据，请耐心等候'
        });
      for (let i = 0; i < App.names.length; ++i) {
        pros.push((function (i) {
          let proc = null;
          if (labelStorage.rem[App.names[i] + "\'s" + App.shifts[i]] != null)
            proc = Promise.resolve(labelStorage.rem[App.names[i] + "\'s" + App.shifts[i]])
          else
            proc = App.$http.get('/label?name=' + App.names[i] + '&shift=' +
              App.shifts[i] + '&num=' + App.names.length + '&' + Math.random()
            )
          return proc.then(function (res) {
            let json = res.data;
            if (typeof res.data == "string")
              json = JSON.parse(res.data);
            //console.log(json);
            App.labels[i] = json.labels;
            App.steps[i] = json.step;
            labelStorage.rem[App.names[i]] = { data : json };

            labelStorage.renderColor(
              App, i, null, null, App.shifts[i]
            );
            if (i == 0) {
              App.global_max = json.global_max;
              App.global_min = json.global_min;
              //console.log(App.global_max, App.global_min);
              App.globalType = utils.judgeExtremeType(
                App.global_min,
                App.global_max
              );
              if (App.globalType == 'month' || App.globalType == 'year') {
                App.window_max = App.global_min + _week;
                App.window_min = App.global_min;
              } else {
                App.window_max = App.global_max;
                App.window_min = App.global_min;
              }
            }
          }, function (res) {
            if (App.option.message)
              App.$message({
                showClose: true,
                message: '数据获取失败，切换到临时数据',
                type: 'error'
              });
            App.labels[i] = [];
            let labels = App.labels[i];
            if (i == 0) App.steps[i] = 40 * 1000;
            else App.steps[i] = 60 * 1000;
            //console.log(App.steps);
            let start = 1258675200000;
            let end = 1258675200000 + 300000 * 60 * 1000;
            let step = utils.judgeStep(
              App.steps[i],
              end - start,
              App.names.length, true
            );
            step = App.steps[i];
            let istart = Math.round(start / step) * step;
            let iend = Math.round(end / step) * step;
            for (let j = istart; j <= iend; j += step) {
              let tmp = labelStorage.virtual_get(
                App.names[i],
                j - parseInt(App.shifts[i])
              );
              tmp[0] += parseInt(App.shifts[i]);
              App.labels[i].push(tmp);
            }

            labelStorage.renderColor(
              App, i, null, null, App.shifts[i]
            );
            if (i == 0) {
              App.global_max = labels[labels.length - 1][0];
              App.global_min = labels[0][0];
              App.globalType = utils.judgeExtremeType(
                App.global_min,
                App.global_max
              );
              if (App.globalType == 'month' || App.globalType == 'year') {
                App.window_max = App.global_min + _week;
                App.window_min = App.global_min;
              } else {
                App.window_max = App.global_max;
                App.window_min = App.global_min;
              }
            }
          });
        })(i));
      }
      return Promise.all(pros);
    },
    cache: [],
    // Draw the graph using the data of `procLabel`.
    redraw: function (App,
                      chart,
                      start = null,
                      end = null,
                      strict = false) {
      while (labelStorage.cache.length < App.labels.length)
        labelStorage.cache.push(null);
      for (let i = 0; i < App.labels.length; ++i) {
        let pack = utils.sampling(
          App.renders[i], App.shifts[i],
          App.labels.length, labelStorage.cache[i], start, end, strict
        );
        App.chart.series[i].setData(pack.sample, true, false, false);
        labelStorage.cache[i] = pack;
      }
      for (let i = 0; i < App.labels.length; ++i) {
        if (App.option.plotLine) {
          if (i == 0) {
            let value = utils.judgePlotLine(
              App.labels[i],
              start,
              end
            );
            // Because we maybe would like to use virtual
            // redraw function in a virtual graph.
            if (chart.yAxis) {
              for (let j = 0; j < value.length; ++j) {
                chart.yAxis[0].removePlotLine(
                  'plot-line-average-' + j
                );
                if (j == 0)
                  chart.yAxis[0].addPlotLine({           // Insert to Axis[0]
                    zIndex: 6,
                    value: value[j],                           // Where value is equal to `value`
                    width: 2,                           // Width of line is 2px
                    color: '#1CFFC5',                  // The color of plot line
                    id: 'plot-line-average-' + j,                  // Id of plot line, need it to remove this plot line
                    label: {
                      text: "Average value: " + value[j],    // Content of label
                      align: 'left',                // Place on the left of window
                      x: 10,                         // The margin to left is 10px
                      style: {
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }
                    }
                  });
                else
                  chart.yAxis[0].addPlotLine({           // Insert to Axis[0]
                    zIndex: 5,
                    value: value[j],                           // Where value is equal to `value`
                    width: 2,                           // Width of line is 2px
                    color: '#1CFFC5',                  // The color of plot line
                    dashStyle: 'longdashdot',
                    id: 'plot-line-average-' + j
                  });
              }
            }
          }
        } else {
          if (chart.yAxis) {
            // A trick that fix the length of value of plot lines.
            for (let j = 0; j < 3; ++j) {
              chart.yAxis[0].removePlotLine(
                'plot-line-average-' + j
              );
            }
          }
        }
        //console.log("Series");
        //console.log(chart.series);
      }
      // chart.redraw();
    },
    renderColor: function(App, i, start, end, shift) {
      let colors = [
        Highcharts.theme.colors[i % Highcharts.theme.colors.length],
        '#f45b5b',
        '#f4f45b',
        '#5bf45b'
      ];
      if (start == null)
        start = 0;
      else
        start = utils.binarySearch(App.labels[i], start + shift);
      if (end == null)
        end = INF;
      else
        end = end + shift;
      for (let j = start; j < App.labels[i].length; ++j) {
        if (App.labels[i][j][0] > end)
          break;
        let tmp = {
          x: App.labels[i][j][0],
          y: App.labels[i][j][1],
          segmentColor: colors[
            utils.judgeState(App.labels[i][j], App.option.anomaly)
          ]
        }
        while (App.renders[i].length <= j)
          App.renders[i].push(tmp);
        App.renders[i][j] = tmp;
      }
    },
    // Save the mark operator and update `labels` array.
    save: function (App, name, start, end, op) {
      start -= App.shifts[0];
      end -= App.shifts[0];
      return App.$http.post('/mark?name=' + name +
        '&start=' + start +
        '&end=' + end +
        '&op=' + op + '&' + Math.random())
        .then(function (res) {
          for (let i = 0; i < App.labels.length; ++i)
            if (App.names[i] == App.names[0]) {
              let x = utils.binarySearch(
                App.labels[i],
                start + App.shifts[i]
              );
              // Notice the shifts affect the axis x so we need translate the
              // x axis to compare with the labels.
              for (; x < App.labels[i].length; x++) {
                if (App.labels[i][x][0] > end + App.shifts[i])
                  break;
                App.labels[i][x][2] = op;
              }

              labelStorage.renderColor(
                App, i, start, end, App.shifts[i]
              )
            }
          if (App.option.message)
          // Show the message if need (open the message switch).
            App.$message({
              showClose: true,
              message: '数据[' + start + ',' + end + ']获标记成功',
              type: 'success'
            });
        }, function (res) {
          // Show the message if need (open the message switch).
          if (App.option.message)
            App.$message({
              showClose: true,
              message: '数据获标记失败',
              type: 'error'
            });
          // Modify the labels of local storage.
          for (let i = 0; i < App.labels.length; ++i)
            if (App.names[i] == App.names[0]) {
              let x = utils.binarySearch(
                App.labels[i],
                start + App.shifts[i]
              );
              for (; x < App.labels[i].length; x++) {
                if (App.labels[i][x][0] > end + App.shifts[i])
                  break;
                App.labels[i][x][2] = op;
              }

              labelStorage.renderColor(
                App, i, start, end, App.shifts[i]
              )
            }
        })
    }
  };
  let filters = {
    all: function (labels) {
      return labels
    },
    positive: function (labels) {
      return labels.filter(function (labels) {
        return labels.label == true
      })
    },
    unpositive: function (labels) {
      return labels.filter(function (labels) {
        return labels.label == false
      })
    },
    label: function (labels, flag) {
      return labels.filter(function (labels) {
        return labels.label == flag
      })
    }
  };

  export default {
    data() {
      return {
        labels: [],
        names: [],
        shifts: [],
        allNames: [],
        extremeType: null,
        global_max: 0,
        global_min: 0,
        window_max: 0,
        window_min: 0,
        series: {
          visible: false,
          names: [],
          shifts: []
        },
        upload: {
          visible: false
        },
        chart: null,
        show_menu: false,
        option: {
          label: true,
          scale: false,
          message: false,
          plotLine: false,
          anomaly: false,
          animation: true,
          theme: true
        },
        setExtremesLock: Promise.resolve(),
        setWindow: true
      }
    },
    mounted() {
      let App = this;
      App.names = window.names;
      App.shifts = window.shifts;
      App.steps = {};
      labelStorage.getNames(App)
        .then(function (names) {
          App.allNames = names;
        });
      keyManager.init();
      this.init();
    },
    watch: {
      '$route' (to, from) {
      },
    },
    computed: {},
    filters: {},
    methods: {
      init: function () {
        let App = this;
        App.labels = [];
        App.renders = [];
        App.steps = {};
        for (let i = 0; i < App.names.length; ++i) {
          App.labels.push([]);
          App.renders.push([]);
        }
        labelStorage.cache = [];
        let chart = {};
        labelStorage.fetch(App)
          .then(() => {
            chart.series = [];
            for (let i = 0; i < App.names.length; ++i)
              chart.series.push({
                show: function () {
                  // Do nothing here
                },
                update: function () {
                },
                setData: function (data, redraw, anomation, points) {
                  this.data = data
                },
                data: []
              });
            App.chart = chart;
            labelStorage.redraw(App, chart)
          })
          .then(function () {
            // Try to show the opprentice label result
            let container = jquery('#container')[0];
            let pre_series = [];
            //console.log(chart.series);
            for (let i = 0; i < App.labels.length; ++i) {
              let showInNavigator =
                App.global_min <= App.labels[i][App.labels[i].length - 1][0] &&
                App.global_max >= App.labels[i][0][0];
              pre_series.push({
                lineWidth: i == 0 ? 2 : 0.5,
                name: App.names[i] +
                (App.shifts[i] != 0 ? '\'s ' + App.shifts[i] : ''),
                data: App.chart.series[i].data,
                showInNavigator: showInNavigator,
                turboThreshold: 100000000
              });
            }

            function goPrev() {
              let max = App.chart.xAxis[0].max;
              let min = App.chart.xAxis[0].min;
              let step = max - min;
              min -= step;
              max -= step;
              App.chart.xAxis[0].setExtremes(
                min,
                max
              );
              let size = App.window_max - App.window_min;
              if (min < App.window_min)
                App.update(min, min + size);
              if (max > App.window_max)
                App.update(max - size, max);
            }

            function goNext() {
              let max = App.chart.xAxis[0].max;
              let min = App.chart.xAxis[0].min;
              let step = max - min;
              min += step;
              max += step;
              App.chart.xAxis[0].setExtremes(
                min,
                max
              );
              let size = App.window_max - App.window_min;
              if (min < App.window_min)
                App.update(min, min + size);
              if (max > App.window_max)
                App.update(max - size, max);
            }

            function zoomIn() {
              let max = App.chart.xAxis[0].max;
              let min = App.chart.xAxis[0].min;
              let step = max - min;
              min += step / 4;
              max -= step / 4;
              App.chart.xAxis[0].setExtremes(
                min,
                max
              );
              let size = App.window_max - App.window_min;
              if (min < App.window_min)
                App.update(min, min + size);
              if (max > App.window_max)
                App.update(max - size, max);
            }


            function zoomOut() {
              let max = App.chart.xAxis[0].max;
              let min = App.chart.xAxis[0].min;
              let step = max - min;
              min -= step / 2;
              max += step / 2;
              App.chart.xAxis[0].setExtremes(
                min,
                max
              );
              let size = App.window_max - App.window_min;
              if (min < App.window_min)
                App.update(min, min + size);
              if (max > App.window_max)
                App.update(max - size, max);
            }

            keyManager.bindEvent('a', goPrev);
            keyManager.bindEvent('d', goNext);
            keyManager.bindEvent('w', zoomOut);
            keyManager.bindEvent('s', zoomIn);

            if (App.option.theme)
              theme_grid(Highcharts);
            else
              theme(Highcharts);
            let option = {
              chart: {
                animation: App.option.animation,
                type: 'coloredline',
                zoomType: 'x',
                resetZoomButton: {
                  theme: {
                    display: 'inline'
                  }
                },
                events: {
                  load: function () {
                    this.xAxis[0].setExtremes(
                      App.window_min,
                      App.window_max
                    );
                    this.xAxis[0].update({
                      min: App.window_min,
                      max: App.window_max
                    });

                    //check if History API is available
                    if (window.history && window.history.pushState) {
                      //push the initial chart state
                      var e = this.xAxis[0].getExtremes();
                      window.history.pushState({
                        time: 0,
                        min: e.min,
                        max: e.max
                      }, "");

                      //back-forward event handler
                      jquery(window).on("popstate", function (event) {
                        if (event.originalEvent.state) {
                          let min = event.originalEvent.state.min;
                          let max = event.originalEvent.state.max;
                          App.chart.xAxis[0].setExtremes(min, max, true, false);
                          let size = App.window_max - App.window_min;
                          if (min < App.window_min)
                            App.update(min, min + size);
                          if (max > App.window_max)
                            App.update(max - size, max);
                        }
                      });
                    }
                  },
                  selection: function (e) {
                    let scale = App.option.scale || keyManager.checkCode('z');
                    if (!scale) {
                      if (e.xAxis && App.chart.options.chart.zoomType == 'x') {
                        if (App.extremeType == 'day') {
                          labelStorage.save(
                            App,
                            App.names[0],
                            e.xAxis[0].min,
                            e.xAxis[0].max,
                            (keyManager.checkCode('spacebar')) ^
                            App.option.label
                          ).then(function (res) {
                            labelStorage.redraw(
                              App, App.chart,
                              Math.round(App.chart.xAxis[0].min),
                              Math.round(App.chart.xAxis[0].max),
                              true
                            );
                          });
                        } else {
                          if (App.option.message)
                            App.$message({
                              showClose: true,
                              message: '标记时必须缩放到一天以内',
                              type: 'warning'
                            });
                        }
                      }
                    } else {
                      if (App.chart.options.chart.zoomType == 'y') {
                        if (!App.chart.resetZoomButton || App.chart.resetZoomButton == 'blocked') {
                          App.chart.showResetZoom();
                          App.chart.resetZoomButton.on('click',
                            () => {
                              App.chart.yAxis[0].setExtremes(null, null);
                              App.chart.resetZoomButton = App.chart.resetZoomButton.destroy();
                            }
                          )
                        }
                      }
                    }
                    //console.log(App.option.scale);
                    return scale;
                  }
                }
              },
              legend: {
                enabled: true,
                itemStyle: {
                  fontSize: '1em',
                  fontStyle: 'normal',
                  fontWeight: 'bold'
                },
                symbolRadius: 0,
                symbolWidth: 16
              },
              rangeSelector: {
                inputBoxWidth: 120,
                buttons: [{
                  type: 'hour',
                  count: 1,
                  text: '1h'
                }, {
                  type: 'hour',
                  count: 6,
                  text: '6h'
                }, {
                  type: 'day',
                  count: 1,
                  text: '1d'
                }, {
                  type: 'week',
                  count: 1,
                  text: '1w'
                }, {
                  type: '',
                  count: 1,
                  text: 'Prev',
                  click: goPrev
                }, {
                  type: '',
                  count: 1,
                  text: 'Next',
                  click: goNext
                }, {
                  type: '',
                  count: 1,
                  text: 'X',
                  click: function (event) {
                    if (App.chart.options.chart.zoomType == 'x') {
                      App.chart.update({
                        chart: {
                          zoomType: 'y'
                        }
                      });
                      if (App.option.message)
                        App.$message({
                          showClose: true,
                          message: '切换到y轴模式'
                        });
                      this.lastElementChild.textContent = "Y"
                    } else {
                      App.chart.update({
                        chart: {
                          zoomType: 'x'
                        }
                      });
                      if (App.option.message)
                        App.$message({
                          showClose: true,
                          message: '切换到x轴模式'
                        });
                      this.lastElementChild.textContent = "X"
                    }
                  }
                }, {
                  type: '',
                  count: 1,
                  text: 'Series',
                  click: function () {
                    labelStorage.getNames(App)
                      .then(function (names) {
                        App.allNames = names;
                        App.series.names = [];
                        App.series.shifts = [];
                        for (let i = 0; i < App.names.length; ++i) {
                          App.series.names.push(App.names[i]);
                          App.series.shifts.push(App.shifts[i]);
                        }
                        App.series.visible = true;
                      });
                  }
                }, {
                  type: '',
                  count: 1,
                  text: 'Upload',
                  click: function () {
                    App.upload.visible = true;
                  }
                }, {
                  type: '',
                  count: 1,
                  text: 'Option',
                  click: function () {
                    App.toggleMenu();
                  }
                }, {
                  type: '',
                  count: 1,
                  text: 'Get Csv',
                  click: function () {
                    if (App.names.length > 0) {
                      exportCsv(App.labels[0], App.names[0]);
                    }
                  }
                }]
              },
              xAxis: {
                //minRange: 1000 * 60 * 60,
                events: {
                  setExtremes: function (e) {
                    App.extremeType = utils.judgeExtremeType(
                      e.min,
                      e.max
                    );
                  },
                  afterSetExtremes: function (e) {
                    //use History API to navigate through the chart
                    if (e.trigger != null && window.history && window.history.pushState) {
                      //fired only if extremes changed by the user action (not autoupdate or simple setExtremes call)
                      var l = window.history.state;
                      var t = Date.now();
                      if (l != null && t - l.time < 30) {
                         //If last changes were made within history.opInterval interval just update last history record
                         window.history.replaceState({ time: t, min: e.min, max: e.max }, "");
                      }
                      else {
                       //Add new record otherwise
                       window.history.pushState({ time: t, min: e.min, max: e.max }, "");
                      }
                    }
                    App.setExtremesLock = App.setExtremesLock.then(
                      () => {
                        labelStorage.redraw(
                          App, App.chart,
                          Math.round(e.min),
                          Math.round(e.max)
                        )
                      }
                    );
                  }
                }
              },
              yAxis: {
                // max: 1.0,
                // min: -1.0
              },
              scrollbar: {
                enabled: App.labels.length > 0
              },
              navigator: {
                adaptToUpdatedData: false
              },
              credits: {
                enabled: false
              },
              series: pre_series
            };
            App.chart = Highcharts.stockChart(container, option);
            let autosize = function () {
              App.chart.setSize(
                Math.max(
                  100,
                  jquery(window).width()
                ),
                Math.max(
                  100,
                  jquery(window).height() - 20
                ),
                false
              );
            };
            jquery(window).resize(autosize);
            autosize();
            let c = App.chart.rangeSelector.buttons;
            let d = App.chart.options.rangeSelector.buttons;

            function bindEvents(b, c) {
              if (c.click) {
                b.on("click", c.click);
              }
            }

            if (c && d) {
              for (let i = 0; i < c.length; i++) {
                if (d[i]) bindEvents(c[i], d[i]);
              }
            }
            App.$refs.globalbar.$emit(
              'init',
              App.global_max,
              App.global_min,
              App.window_max,
              App.window_min
            );
          });
      },
      destroy: function () {
        this.$refs.globalbar.$emit('destroy');
        this.chart.destroy();
      },
      update: function (window_min, window_max) {
        console.log(window_min, window_max);
        this.window_min = window_min;
        this.window_max = window_max;
        this.chart.xAxis[1].update({
          min: window_min,
          max: window_max
        });
      },
      querySearch: function (name, cb) {
        let result = name ? this.allNames.filter(
            (state) => {
              return (state.value.indexOf(name.toLowerCase()) === 0);
            }
          ) : this.allNames;
        cb(result);
      },
      removeSeries: function (index) {
        this.series.names.splice(index, 1);
        this.series.shifts.splice(index, 1);
      },
      addSeries: function () {
        this.series.names.push('');
        this.series.shifts.push('');
      },
      confirmSeries: function () {
        this.names = this.series.names;
        this.shifts = this.series.shifts;
        for (let i in this.names)
          if (!this.names[i]) this.names[i] = "";
        for (let i in this.shifts)
          if (!this.shifts[i]) this.shifts[i] = 0;
          else {
            let shift = this.shifts[i].toString();
            let mul_shift = 1;
            if (shift.indexOf('y') > 0) {
              shift.replace('d', '');
              mul_shift = 365 * 86400 * 1000;
            }
            if (shift.indexOf('M') > 0) {
              shift.replace('d', '');
              mul_shift = 30 * 86400 * 1000;
            }
            if (shift.indexOf('w') > 0) {
              shift.replace('d', '');
              mul_shift = 7 * 86400 * 1000;
            }
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
            shift = parseInt(shift) * mul_shift;
            this.shifts[i] = shift;
          }
        this.series.visible = false;
        if (this.option.message)
          this.$message({
            showClose: true,
            message: '正在加载新视图...',
            type: 'success'
          });
        this.destroy();
        this.init();
      },
      cancelSeries: function () {
        this.series.visible = false;
      },
      toggleContainer: function (show_menu) {
        //console.log(show_menu);
        this.show_menu = show_menu;
      },
      toggleContent: function (e) {
        //console.log('toggleContent');
        if (this.show_menu)
          this.$refs.menu.$emit('toggleMenu');
      },
      toggleMenu: function (e) {
        //console.log('toggleMenu');
        this.$refs.menu.$emit('toggleMenu');
      },
      updateOption: function (option) {
        //console.log('updateOption');
        let reinit = false;
        let redraw = false;
        if (option.animation != this.option.animation) {
          if (this.chart) {
            this.chart.update({
              chart: {
                animation: option.animation
              }
            })
          }
        }
        if (option.theme != this.option.theme) {
          reinit = true;
        }
        if (option.plotLine != this.option.plotLine)
          redraw = true;
        if (option.anomaly != this.option.anomaly)
          reinit = true;
        for (let o in option)
          this.option[o] = option[o];
        if (reinit)
          this.init();
        else if (redraw) {
          if (this.chart) {
            labelStorage.redraw(
              this, this.chart,
              this.chart.xAxis[0].min,
              this.chart.xAxis[0].max,
              true
            );
          }
        }
      }
    },
    directives: {},
    components: {
      globalbar: GlobalBar,
      optionmenu: Menu
    }
  }
</script>
<style>
    @import "./css/menu_bubble.css";
    @import "./css/normalize.css";
    @import "./fonts/font-awesome-4.7.0/css/font-awesome.min.css";

    .el-autocomplete {
        display: block;
    }
</style>
