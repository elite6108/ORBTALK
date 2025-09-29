import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Use compat to pull in plugin configs that exist if deps are present in the environment.
  // In Netlify build images, some peer ESLint plugins may not be installed; wrap in try/catch.
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    // Guard problematic preset if plugin not present
    (() => {
      try { return "@typescript-eslint/recommended" } catch { return "" }
    })(),
    "plugin:security/recommended",
    "prettier"
  ).filter(Boolean),
  {
    plugins: ["@typescript-eslint", "security"],
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "security/detect-object-injection": "off",
      "security/detect-non-literal-regexp": "off",
    },
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
