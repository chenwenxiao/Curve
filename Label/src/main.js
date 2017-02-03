import Vue from 'vue'
import VueRouter from 'vue-router'
import ElementUI from 'element-ui'
import VueResource from 'vue-resource'
import 'element-ui/lib/theme-default/index.css'
import App from './App.vue'

Vue.use(ElementUI)
Vue.use(VueRouter)
Vue.use(VueResource)

const router = new VueRouter({
  routes: [
    {path: '/', component: App}
  ]
})

new Vue({
  el: '#app',
  router: router,
  render: h => h(App)
})
