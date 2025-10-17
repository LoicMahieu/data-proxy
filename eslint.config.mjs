// eslint.config.js
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  {
    rules: {
      semi: "off",
      "prefer-const": "error",
      // "quotes": "off",
    },
    ignores: ["packages/*/dist/*.mjs", "packages/*/dist/*.js"],
  },
]);
