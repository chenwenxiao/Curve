<template>
  <div>
    <div v-show="needBar" id="scrollbar" class="scrollbar">
      <div class="handle" style="transform: translateZ(0px) translateY(0px);">
        <div class="mousearea"></div>
      </div>
    </div>
    <div id="slave">

    </div>
  </div>
</template>

<script>
  import $ from 'jquery';
  import Sly from './sly.min.js';
  export default {
    data() {
      return {
        needBar: true
      }
    },
    created() {
      this.$on('init', this.init);
      this.$on('destroy', this.destroy);
    },
    methods: {
      destroy() {
        this.parallax.destroy();
      },

      init(global_max, global_min, window_max, window_min) {
        this.global_max = global_max;
        this.global_min = global_min;
        this.window_max = window_max;
        this.window_min = window_min;

        this.globalSize = this.global_max - this.global_min;
        this.windowSize = this.window_max - this.window_min;
        this.needBar = this.globalSize > this.windowSize;

        let GlobalBar = this;

        let parallax = this.parallax = new window.Sly(this.globalSize, {
          horizontal: 1,
          activateMiddle: 1,
          smart: 1,
          activateOn: 'click',
          mouseDragging: 1,
          touchDragging: 1,
          releaseSwing: 1,
          startAt: 0,
          scrollBar: $('#scrollbar'),
          scrollBy: 1,
          activatePageOn: 'click',
          speed: 200,
          moveBy: 600,
          elasticBounds: 1,
          dragHandle: 1,
          dynamicHandle: 1,
          clickBar: 1,
          scrollSource: $('#slave'),
          dragSource: $('#slave')
        });

        let render = function () {
          console.log('render');

          GlobalBar.window_min = GlobalBar.global_min + parallax.pos.cur;
          GlobalBar.window_max = GlobalBar.global_min + parallax.pos.cur + GlobalBar.windowSize;
          GlobalBar.$emit('update', GlobalBar.window_min, GlobalBar.window_max);
        };

        // Bind events
        parallax.on('load moveEnd', render);

        // Initialize Sly instance
        parallax.init();
        //console.log($(".handle").width());
        $('.handle').width((this.windowSize * 100.0 / this.globalSize) + '%');
        console.log(Math.round(this.windowSize * 100 / this.globalSize) + '%');
        //console.log($(".handle").width());
        GlobalBar.$emit('update', this.window_min, this.window_max);
      }
    }
  }

</script>

<style>
/* Scrollbar */
.scrollbar {
	margin: 0 0 1em 0;
	height: 7px;
	background: #ccc;
	line-height: 0;
}
.scrollbar .handle {
	width: 20%;
	height: 100%;
	background: #fffce1;
	cursor: pointer;
}
.scrollbar .handle .mousearea {
	position: absolute;
	top: -9px;
	left: 0;
	width: 100%;
	height: 40px;
}
</style>
