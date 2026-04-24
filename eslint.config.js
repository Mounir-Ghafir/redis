module.exports = [
  {
    languageOptions: {
      globals: {
        node: "readonly",
        es2021: "readonly"
      },
      parserOptions: {
        ecmaVersion: 2021
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      "prefer-const": "warn"
    },
    ignores: ["node_modules/**"]
  }
];