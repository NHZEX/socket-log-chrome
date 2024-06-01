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
            /* >>> */
            /* 解决`enum`误报 https://github.com/typescript-eslint/typescript-eslint/issues/2619#issuecomment-701901752 */
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": "error"
            /* <<< */
        }
    }
];
