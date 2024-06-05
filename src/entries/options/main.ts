import { createApp } from "vue";
import App from "./App.vue";
import store from "~/stores/index"

createApp(App).use(store).mount("#app");
