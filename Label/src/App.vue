<template>
  <div class="container" :class="{'show-menu': show_menu}">
    <optionmenu @toggleContainer="toggleContainer" @updateOption="updateOption"
                ref="menu"></optionmenu>

    <div class="content-wrap" @click="toggleContent">
      <div class="content">
        <div id="container" style="width:100%;"></div>
        <globalbar ref="globalbar"
                   @update="update"/>
        <el-dialog title="上传数据" v-model="upload.visible" size="none">
          <el-upload action="upload" type="drag" :multiple="true">
            <i class="el-icon-upload"></i>
            <div class="el-dragger__text">将文件拖到此处，或<em>点击上传</em></div>
            <div class="el-upload__tip" slot="tip">只能上传csv文件，大小不限</div>
          </el-upload>
        </el-dialog>

        </uploadcsv>
        <el-dialog title="数据列表" v-model="series.visible" size="large">
          <el-form :model="series">
            <el-form-item v-for="(name, index) in series.names"
                          :label="'数据' + index" label-width="80px">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-autocomplete
                    v-model="series.names[index]"
                    :fetch-suggestions="querySearch"
                    placeholder="请输入数据名称"
                    :trigger-on-focus="false">
                  </el-autocomplete>
                </el-col>
                <el-col :span="7">
                  <el-input
                    placeholder="请输入偏移量"
                    v-model="series.shifts[index]">
                  </el-input>
                </el-col>
                <el-col :span="4">
                  <el-button @click.prevent="removeSeries(index)">删除</el-button>
                </el-col>
              </el-row>
            </el-form-item>
          </el-form>
          <div slot="footer" class="dialog-footer">
            <el-button @click="cancelSeries">取 消</el-button>
            <el-button @click="addSeries">新增数据</el-button>
            <el-button type="primary" @click="confirmSeries">确 定</el-button>
          </div>
        </el-dialog>
      </div>
    </div>
  </div>

</template>

<script>
  import Highcharts from 'highcharts/highstock';
  import theme from './theme.js'
  import jquery from 'jquery';
  import GlobalBar from './GlobalBar.vue';
  import Menu from './Menu.vue';
  import theme_grid from './theme_grid.js';

  theme_grid(Highcharts);

  var _minute = 1000 * 60;
  var _hour = 1000 * 60 * 60;
  var _day = 1000 * 60 * 60 * 24;
  var _week = 1000 * 60 * 60 * 24 * 7;
  var _month = 1000 * 60 * 60 * 24 * 30;
  var _year = 1000 * 60 * 60 * 24 * 365;

  var marks = {};
  marks['sin'] = [];
  marks['cos'] = [];
  var STORAGE_KEY = 'mikuru-2.0';
  var labelStorage = {
    rem: {},
    getNames: function (App) {
      return App.$http.get('/name').then(function (res) {
        return JSON.parse(res.data);
      }, function (res) {
        return [{
          value: 'sin'
        }, {
          value: 'cos'
        }];
      });
    },

    virtual_get: function (name, index) {
      var flag = 0;
      for (var i = 0; i < marks[name].length; ++i)
        if (marks[name][i][0] <= index && index <= marks[name][i][1]) {
          flag = marks[name][i][2];
        }
      var y = 0;
      if (name == 'sin')
        y = Math.sin(index * 1.0 / 6000000);
      else if (name == 'cos')
        y = Math.cos(index * 1.0 / 6000000);
      return [index, y, flag];
    },

    fetch: function (App, start = 0, end = 0, strict = false) {
      var LS = this;
      var pros = [];
      if (start == 0 && end == 0) {
        if (App.names.length > 0 && App.option.download == false)
          App.$message({
            showClose: true,
            message: '正在获取数据，请耐心等候'
          });
        for (var i = 0; i < App.names.length; ++i) {
          pros.push((function (i) {
            return App.$http.get('/label?name=' + App.names[i] + '&shift=' +
              App.shifts[i] + '&num=' + App.names.length + "&download=" +
              App.option.download).then(function (res) {
              var json = JSON.parse(res.data);
              console.log(json);
              App.labels[i] = json.labels;
              App.steps[i] = json.step;
              if (i == 0) {
                App.global_max = json.global_max;
                App.global_min = json.global_min;
                console.log(App.global_max, App.global_min);
                App.globalType = utils.judgeExtremeType(App.global_min, App.global_max);
                if (App.globalType == 'month' || App.globalType == 'year') {
                  App.window_max = App.global_min + _week;
                  App.window_min = App.global_min;
                } else {
                  App.window_max = App.global_max;
                  App.window_min = App.global_min;
                }
              }
              return false;
            }, function (res) {
              if (App.option.message)
                App.$message({
                  showClose: true,
                  message: '数据获取失败，切换到临时数据',
                  type: 'error'
                });
              App.labels[i] = [];
              var labels = App.labels[i];
              if (i == 0) App.steps[i] = 40 * 1000;
              else App.steps[i] = 60 * 1000;

              console.log(App.steps);
              var start = 1258675200000;
              var end = 1258675200000 + 100000 * 60 * 1000;
              var step = utils.judgeStep(App.steps[i], end - start, App.names.length, true);
              if (!App.option.download)
                step = App.steps[i];
              var istart = Math.round(start / step) * step;
              var iend = Math.round(end / step) * step;
              for (var j = istart; j <= iend; j += step) {
                var tmp = labelStorage.virtual_get(App.names[i], j - parseInt(App.shifts[i]));
                tmp[0] += parseInt(App.shifts[i]);
                App.labels[i].push(tmp);
              }
              if (i == 0) {
                App.global_max = labels[labels.length - 1][0];
                App.global_min = labels[0][0];
                App.globalType = utils.judgeExtremeType(App.global_min, App.global_max);
                if (App.globalType == 'month' || App.globalType == 'year') {
                  App.window_max = App.global_min + _week;
                  App.window_min = App.global_min;
                } else {
                  App.window_max = App.global_max;
                  App.window_min = App.global_min;
                }
              }
              return false;
            });
          })(i));
        }
      } else {
        //App.chart.showLoading('Loading data from server...');
        for (var i = 0; i < App.names.length; ++i) {
          pros.push((function (i) {
            var step = utils.judgeStep(App.steps[i], end - start, App.names.length);
            var exstart = Math.max(App.global_min, start - 500 * step);
            var exend = Math.min(App.global_max, end + 500 * step);

            var drstart = Math.max(App.global_min, start - 300 * step);
            var drend = Math.min(App.global_max, end + 300 * step);

            var istart = Math.round(drstart / step) * step;
            var iend = Math.round(drend / step) * step;
            console.log(istart, iend, step);
            console.log(LS.rem[i]);

            var lazy = false;
            if (LS.rem[i])
              lazy = LS.rem[i].step == step && LS.rem[i].istart <= istart && LS.rem[i].iend >= iend;
            if (lazy && !strict) {
              return Promise.resolve(true);
            } else {
              istart = Math.round(exstart / step) * step;
              iend = Math.round(exend / step) * step;
              LS.rem[i] = {
                istart: istart,
                iend: iend,
                step: step
              };
              return App.$http.get('/label?name=' + App.names[i] + '&start='
                + exstart + '&end=' + exend + '&shift=' + App.shifts[i] +
                '&num=' + App.names.length + "&download=" +
                App.option.download).then(function (res) {
                App.labels[i] = JSON.parse(res.data).labels;
                return lazy;
              }, function (res) {
                if (App.option.message)
                  App.$message({
                    showClose: true,
                    message: '数据获取失败，切换到临时数据',
                    type: 'error'
                  });
                App.labels[i] = [];
                for (var j = istart; j <= iend; j += step) {
                  var tmp = labelStorage.virtual_get(App.names[i], j - parseInt(App.shifts[i]));
                  tmp[0] += parseInt(App.shifts[i]);
                  App.labels[i].push(tmp);
                }
                return lazy;
              });
            }
          })(i));
        }
      }
      return Promise.all(pros).then(function (res) {
        console.log('fetch all', res);
        var ans = true;
        for (var i = 0; i < res.length; ++i)
          ans = ans && res[i];
        return ans;
      });
    },

    reload: function (App, chart, start, end, strict = false) {
      console.log(App.labels[0]);
      if (App.option.download)
        return labelStorage.fetch(App, start, end, strict).then(function (res) {
          labelStorage.redraw(App, strict, res, chart)
        });
      else
        return Promise.resolve(labelStorage.redraw(App, strict, true, chart));
    },

    redraw: function (App, strict, res, chart) {
      if (strict || !res) {
        console.log(res);
        console.log(App.labels);
        if (!res)
          for (var i = 0; i < App.labels.length; ++i)
            chart.series[i].setData(App.labels[i]);
        // chart.hideLoading();
        for (var i = 0; i < App.labels.length; ++i) {
          var zones = utils.judgeZones(App.labels[i], chart.series[i].color, chart.series[i].zones, App.steps[i]);
          chart.series[i].zones = zones;
          chart.series[i].show();
          if (App.option.download == false)
            if (chart.series.length > App.labels.length + i) {
              chart.series[App.labels.length + i].zones = zones;
              chart.series[App.labels.length + i].show();
            }
          console.log("Series");
          console.log(chart.series);
        }
        // chart.redraw();
      }
    },

    save: function (App, name, start, end, op) {
      start -= App.shifts[0];
      end -= App.shifts[0];
      return App.$http.post('/mark?name=' + name +
        '&start=' + start +
        '&end=' + end +
        '&op=' + op)
        .then(function (res) {
          for (let i = 0; i < App.labels.length; ++i)
            if (App.names[i] == App.names[0]) {
              let x = utils.binarySearch(App.labels[i], start + App.shifts[i]);
              for (; x < App.labels[i].length; x++) {
                if (App.labels[i][x][0] > end + App.shifts[i])
                  break;
                App.labels[i][x][2] = op;
              }
            }
          if (App.option.message)
            App.$message({
              showClose: true,
              message: '数据[' + start + ',' + end + ']获标记成功',
              type: 'success'
            });
        }, function (res) {
          if (App.option.message)
            App.$message({
              showClose: true,
              message: '数据获标记失败',
              type: 'error'
            });
          for (let i = 0; i < App.labels.length; ++i)
            if (App.names[i] == App.names[0]) {
              let x = utils.binarySearch(App.labels[i], start + App.shifts[i]);
              for (; x < App.labels[i].length; x++) {
                if (App.labels[i][x][0] > end + App.shifts[i])
                  break;
                App.labels[i][x][2] = op;
              }
            }
          marks[name].push([start, end, op]);
        })
    }
  };

  var filters = {
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
  }

  var utils = {
    judgeZones: function (labels, defaultColor, oldZones, unitStep) {
      console.log(labels);
      var zones = [];
      var last = 0;
      for (var i = 0; i < labels.length; ++i) {
        if (labels[i][2] != last) {
          zones.push({
            value: labels[i][0] - unitStep / 2,
            color: last > 0 ? '#f45b5b' : defaultColor
          });
          last = labels[i][2];
        }
      }
      zones.push({color: last > 0 ? '#f45b5b' : defaultColor});
      while (zones.length < oldZones.length)
        zones.push({color: defaultColor});
      console.log(zones)
      return zones;
    },

    binarySearch: function (data, dest) {
      //find the smallest index in data whose value is large or equal than dest
      var h = data.length - 1, l = 0;
      if (dest > data[h][0])
        return h + 1;
      while (l < h) {
        var m = Math.floor((h + l) / 2);
        if (dest > data[m][0]) {
          l = m + 1;
        } else {
          h = m;
        }
      }
      return l;
    },
    judgeExtremeType: function (min, max) {
      //judge the extrme type, including day, week, month. year
      var size = max - min;
      if (size <= _day)
        return 'day';
      else if (size <= _week)
        return 'week';
      else if (size <= _month)
        return 'month';
      else
        return 'year';
    },
    judgeStep: function (unit, size, nums, global = false) {
      var step = unit;
      if (global) nums = 1;
      while (size / step * nums > 1500) {
        step = step * 2;
      }
      return step;
    }

  }

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
          download: false
        }
      }
    },

    mounted() {
      var App = this;
      App.names = window.names;
      App.shifts = window.shifts;
      App.steps = {};
      labelStorage.getNames(App).then(function (names) {
        App.allNames = names;
      });
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
        var App = this;
        App.labels = [];
        App.steps = {};
        for (var i = 0; i < App.names.length; ++i)
          App.labels.push([]);
        let chart = {};
        labelStorage.fetch(App)
          .then(() => {
            chart.series = [];
            for (let i = 0; i < App.names.length; ++i)
              chart.series.push({
                show: function () {
                  // Do nothing here
                },
                zones: [],
                color: Highcharts.theme.colors[i % Highcharts.theme.colors.length]
              });
            return labelStorage.redraw(App, true, true, chart)
          })
          .then(function () {
            var container = jquery('#container')[0];
            var pre_series = [];
            console.log("zones");
            console.log(chart.series);
            for (var i = 0; i < App.labels.length; ++i)
              pre_series.push({
                lineWidth: i == 0 ? 2 : 0.5,
                name: App.names[i] + (App.shifts[i] != 0 ? '\'s ' + App.shifts[i] : ''),
                data: App.labels[i],
                zoneAxis: 'x',
                zones: chart.series[i].zones,
                showInNavigator: App.global_min <= App.labels[i][App.labels[i].length - 1][0] &&
                App.global_max >= App.labels[i][0][0]
              });
            var option = {
              chart: {
                type: 'spline',
                zoomType: 'x',
                events: {
                  load: function () {
                    this.xAxis[0].setExtremes(App.window_min, App.window_max);
                    this.xAxis[0].update({
                      min: App.window_min,
                      max: App.window_max
                    });
                  },
                  selection: function (e) {
                    if (!App.option.scale)
                      if (e.xAxis) {
                        if (App.extremeType == 'day') {
                          labelStorage.save(App, App.names[0], e.xAxis[0].min, e.xAxis[0].max, App.option.label).then(function (res) {
                            labelStorage.reload(App, App.chart, Math.round(App.chart.xAxis[0].min), Math.round(App.chart.xAxis[0].max), true);
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
                    console.log(App.option.scale);
                    return App.option.scale;
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
                  type: 'all',
                  count: 1,
                  text: 'all'
                }, {
                  type: '',
                  count: 1,
                  text: 'Prev',
                  click: function () {
                    let max = App.chart.xAxis[0].max;
                    let min = App.chart.xAxis[0].min;
                    let step = max - min;
                    App.chart.xAxis[0].setExtremes(min - step, max - step);
                  }
                }, {
                  type: '',
                  count: 1,
                  text: 'Next',
                  click: function () {
                    let max = App.chart.xAxis[0].max;
                    let min = App.chart.xAxis[0].min;
                    let step = max - min;
                    App.chart.xAxis[0].setExtremes(min + step, max + step);
                  }
                }, {
                  type: '',
                  count: 1,
                  text: 'D&S',
                  click: function () {
                    if (App.chart.options.chart.zoomType == 'x') {
                      App.chart.update({
                        chart: {
                          zoomType: undefined
                        }
                      });
                      if (App.option.message)
                        App.$message({
                          showClose: true,
                          message: '切换到拖动模式'
                        });
                    } else {
                      App.chart.update({
                        chart: {
                          zoomType: 'x'
                        }
                      });
                      if (App.option.message)
                        App.$message({
                          showClose: true,
                          message: '切换到选择模式'
                        });
                    }
                  }
                }, {
                  type: '',
                  count: 1,
                  text: 'Series',
                  click: function () {
                    labelStorage.getNames(App).then(function (names) {
                      App.allNames = names;
                      App.series.names = [];
                      App.series.shifts = [];
                      for (var i = 0; i < App.names.length; ++i) {
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
                }]
              },
              xAxis: {
                //minRange: 1000 * 60 * 60,
                events: {
                  setExtremes: function (e) {
                    App.extremeType = utils.judgeExtremeType(e.min, e.max);
                  },
                  afterSetExtremes: function (e) {
                    labelStorage.reload(App, this, Math.round(e.min), Math.round(e.max))
                  }
                }
              },
              yAxis: {
                // max: 1.0,
                // min: -1.0
              },
              scrollbar: {
                enabled: false
              },
              navigator: {
                adaptToUpdatedData: false
              },
              series: pre_series
            };
            App.chart = Highcharts.stockChart(container, option);
            var autosize = function () {
              App.chart.setSize(Math.max(100, jquery(window).width()), Math.max(100, jquery(window).height() - 20), false);
            };
            jquery(window).resize(autosize);
            autosize();
            var c = App.chart.rangeSelector.buttons, d = App.chart.options.rangeSelector.buttons;

            function bindEvents(b, c) {
              if (c.click) {
                b.on("click", c.click);
              }
            }

            if (c && d) {
              for (var i = 0; i < c.length; i++) {
                if (d[i]) bindEvents(c[i], d[i]);
              }
            }
            App.$refs.globalbar.$emit('init', App.global_max, App.global_min, App.window_max, App.window_min);
          });
      },
      destroy: function () {
        this.$refs.globalbar.$emit('destroy');
        this.chart.destroy();
        labelStorage.rem = {};

      },
      update: function (window_min, window_max) {
        this.chart.xAxis[1].update({
          min: window_min,
          max: window_max
        });
      },
      querySearch: function (name, cb) {
        var result = name ? this.allNames.filter((state) => {
            return (state.value.indexOf(name.toLowerCase()) === 0);
          }) : this.allNames;
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
        for (var i in this.names)
          if (!this.names[i]) this.names[i] = "";
        for (var i in this.shifts)
          if (!this.shifts[i]) this.shifts[i] = 0;
          else {
            let shift = this.shifts[i].toString();
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
        console.log(show_menu);
        this.show_menu = show_menu;
      },
      toggleContent: function (e) {
        console.log('toggleContent');
        if (this.show_menu)
          this.$refs.menu.$emit('toggleMenu');
      },
      toggleMenu: function (e) {
        console.log('toggleMenu');
        this.$refs.menu.$emit('toggleMenu');
      },
      updateOption: function (option) {
        console.log('updateOption');
        this.option = option;
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
