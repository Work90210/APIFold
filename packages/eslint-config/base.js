/** @type {import("eslint").Linter.Config} */
module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/typescript",
    "prettier",
  ],
  plugins: ["@typescript-eslint", "import"],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      { prefer: "type-imports" },
    ],
    "import/order": [
      "warn",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
        ],
        "newlines-between": "always",
        alphabetize: { order: "asc" },
      },
    ],
    "no-console": "warn",
    "no-restricted-syntax": [
      "error",
      {
        selector: "CallExpression[callee.property.name='unsafe']",
        message:
          "sql.unsafe() is a SQL injection footgun. All query strings MUST be compile-time constants with $1/$2 parameterization. If you must use it, add an eslint-disable comment with justification.",
      },
    ],
  },
  ignorePatterns: ["dist/", "build/", ".next/", "node_modules/", "coverage/"],
};
