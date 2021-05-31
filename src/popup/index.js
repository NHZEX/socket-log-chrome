import 'src/assets/style/popup.css'

window.__VUE_PROD_DEVTOOLS__ = true

import { createApp } from 'vue'
import store from '@/store'
import App from './App.vue'


createApp(App)
    .use(store)
    .mount('#app')
