import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    files: ["**/*.{ts,tsx}", "**/*.ts", "**/*.tsx"],
    rules: {
      // Keep strong typing feedback, but do not block builds
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      // Helpful but not build-breaking
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["**/*.js"],
    rules: {
      // Allow CommonJS utilities in JS files
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
