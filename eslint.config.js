// @ts-check
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";
import globals from "globals";

export default defineConfig(
  {
    ignores: ["dist/**", ".astro/**", "node_modules/**", ".wrangler/**"],
  },
  {
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      eslintPluginAstro.configs.recommended,
      eslintPluginAstro.configs["jsx-a11y-recommended"],
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    // Astro frontmatter type-checking needs TS rules relaxed slightly —
    // props/content-collection types are inferred, not always explicit.
    files: ["**/*.astro"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
);
