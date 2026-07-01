module.exports = {
    root: true,
    env: {
        node: true,
    },
    parser: "vue-eslint-parser",
    parserOptions: {
        parser: "@typescript-eslint/parser",
        sourceType: "module",
    },
    extends: [
        "eslint:recommended",
        "plugin:vue/vue3-recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    rules: {
        // Override/add rules settings here, such as:
        // 'vue/no-unused-vars': 'error'
        "@typescript-eslint/no-explicit-any": "off",
        "vue/multi-word-component-names": "off"
    },
};
