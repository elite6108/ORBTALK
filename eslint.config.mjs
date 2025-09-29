import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Keep ESLint lightweight on CI to avoid missing plugin issues
  ...compat.extends(
    "next/core-web-vitals",
    "plugin:security/recommended",
    "prettier"
  ),
  {
    plugins: ["security"],
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
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
