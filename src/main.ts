import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import ElementUI from 'element-plus'
import 'element-plus/dist/index.css'

const app = createApp(App)
ElementUI.install(app)
app.mount('#app')
