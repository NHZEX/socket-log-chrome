import globals from "globals";
import pluginJs from "@eslint/js";
import pluginVue from "eslint-plugin-vue";


export default [
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.webextensions,
            },
        }
    },
    pluginJs.configs.recommended,
    ...pluginVue.configs["flat/essential"],
    {
        rules: {
            'no-unused-vars': 'warn'
        }
    }
];
