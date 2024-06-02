const { defineConfig } = require('eslint-define-config');

module.exports = defineConfig({
    env: {
        webextensions: true,
        es2022: true,
        node: true
    },
    extends: [
        "plugin:vue/vue3-essential",
        "eslint:recommended",
        "@vue/typescript/recommended",
        './.eslintrc-auto-import.json',
    ],
    overrides: [
        {
            env: {
                "node": true
            },
            files: [
                ".eslintrc.{js,cjs}"
            ],
            parserOptions: {
                "sourceType": "script"
            }
        }
    ],
    parser: "vue-eslint-parser",
    parserOptions: {
        ecmaVersion: "latest",
        parser: "@typescript-eslint/parser",
        sourceType: "module",
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        extraFileExtensions: ['.vue', '.json'],
    },
    plugins: [
        "@typescript-eslint",
        "vue"
    ],
    rules: {
        /* >>> */
        /* 解决`enum`误报 https://github.com/typescript-eslint/typescript-eslint/issues/2619#issuecomment-701901752 */
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": "error"
        /* <<< */
    }
})
