<template>
  <div>
    <div class="menu-wrap">
      <nav class="menu">
        <div class="icon-list">
          <a href="#" @click="option.label=!option.label">
            <i class="fa fa-fw"
               :class="{'fa-star': option.label, 'fa-star-o': !option.label}">

            </i>
            <span>
              Label
            </span>
          </a>
          <a href="#" @click="option.scale=!option.scale">
            <i class="fa fa-fw"
               :class="{'fa-bell': option.scale, 'fa-bell-o': !option.scale}">

            </i>
            <span>
              Scale
            </span>
          </a>
          <a href="#" @click="option.message=!option.message">
            <i class="fa fa-fw"
               :class="{'fa-envelope': option.message, 'fa-envelope-o': !option.message}">

            </i>
            <span>
              Message
            </span>
          </a>
          <a href="#" @click="option.plotLine=!option.plotLine">
            <i class="fa fa-fw"
               :class="{ 'fa-check-circle': option.plotLine, 'fa-check-circle-o': !option.plotLine}">

            </i>
            <span>
              Average
            </span>
          </a>
          <a href="#" @click="option.anomaly=!option.anomaly">
            <i class="fa fa-fw"
               :class="{ 'fa-comment': option.anomaly, 'fa-comment-o': !option.anomaly}">

            </i>
            <span>
              AnomalyDetection
            </span>
          </a>
          <a href="#" @click="option.animation=!option.animation">
            <i class="fa fa-fw"
               :class="{ 'fa-building': option.animation, 'fa-building-o': !option.animation}">

            </i>
            <span>
              Animation
            </span>
          </a>
          <a href="#" @click="option.theme=!option.theme">
            <i class="fa fa-fw"
               :class="{ 'fa-sun-o': option.theme, 'fa-moon-o': !option.theme}">

            </i>
            <span>
              Theme
            </span>
          </a>
        </div>
      </nav>
      <button class="close-button"
              id="close-button"
              @click="toggleMenu">
        Close Menu
      </button>
      <div class="morph-shape"
           id="morph-shape"
           data-morph-open="M-7.312,0H15c0,0,66,113.339,66,399.5C81,664.006,15,800,15,800H-7.312V0z;M-7.312,0H100c0,0,0,113.839,0,400c0,264.506,0,400,0,400H-7.312V0z">
        <svg id="svg"
             xmlns="http://www.w3.org/2000/svg"
             width="100%"
             height="100%"
             viewBox="0 0 100 800"
             preserveAspectRatio="none">
          <path d="M-7.312,0H0c0,0,0,113.839,0,400c0,264.506,0,400,0,400h-7.312V0z"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<script>
  import jquery from 'jquery';
  import Snap from 'snapsvg-cjs';
  export default {
    data() {
      return {
        isAnimating: false,
        show_menu: false,
        path: null,
        initialPath: null,
        steps: [],
        option: {
          label: true,
          scale: false,
          message: false,
          plotLine: false,
          anomaly: false,
          animation: true,
          theme: true
        }
      }
    },

    created() {
      this.$on('toggleMenu', this.toggleMenu);
    },

    mounted() {
      //console.log('Snap');
      let s = Snap(jquery('#svg')[0]);
      this.path = s.select('path');
      this.initialPath = this.path.attr('d');
      this.steps = ["M-7.312,0H15c0,0,66,113.339,66,399.5C81,664.006,15,800,15,800H-7.312V0z",
                    "M-7.312,0H100c0,0,0,113.839,0,400c0,264.506,0,400,0,400H-7.312V0z"]
      for (let o in this.option)
        if (window.localStorage) {
          // Browser now support local storage
          if (window.localStorage[o] != null)
            this.option[o] = JSON.parse(window.localStorage[o])
        }

      this.$emit('updateOption', this.option);
    },

    methods: {
      toggleMenu() {
        //console.log('toggleMenu');
        if (this.isAnimating) return false;
        this.isAnimating = true;
        let Menu = this;
        this.$emit('toggleContainer', !this.show_menu);
        if (this.show_menu) {
          this.$emit('updateOption', this.option);

          for (let o in this.option)
            if (window.localStorage) {
              // Browser now support local storage
              if (this.option[o] != null)
                window.localStorage[o] = JSON.stringify(this.option[o])
            }

          setTimeout(function() {
            // reset path
            Menu.path.attr('d', Menu.initialPath );
            Menu.isAnimating = false;
          }, 300);
        } else {
          let pos = 0;
          let nextStep = function(pos ) {
            if (pos > Menu.steps.length - 1) {
              Menu.isAnimating = false;
              return;
            }
            Menu.path.animate({
              'path' : Menu.steps[pos]
            }, pos === 0 ? 400 : 500, pos === 0 ? mina.easein : mina.elastic,
            function() {
              nextStep(pos);
            });
            pos++;
          };
          nextStep(pos);
        }
        this.show_menu = !this.show_menu;
      }
    }
  }

</script>

<style>

</style>
