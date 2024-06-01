import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import fs from "node:fs";

const autoImport = JSON.parse(fs.readFileSync('./.eslintrc-auto-import.json', 'utf8'))

export default [
    {
        languageOptions: {
            globals: {
                ...globals.webextensions,
                ...globals.node,
                // eslintrc.filepath 设置生成 mjs 无法正常工作的临时解决方案
                ...(autoImport.globals ?? {}),
            }
        }
    },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    ...pluginVue.configs["flat/essential"],
    {
        rules: {
            'no-unused-vars': 'warn'
        }
    }
];
