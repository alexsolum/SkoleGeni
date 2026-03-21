import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { react: reactPlugin, "react-hooks": reactHooksPlugin },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }]
    },
    settings: {
      react: { version: "detect" }
    }
  },
  {
    files: ["src/**/*.d.ts", "src/**/*.test.ts", "src/**/*.test.tsx", "src/**/__tests__/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off"
    }
  },
  prettierConfig,
  {
    ignores: ["dist/", "node_modules/", "api/", "docker/", "stitch_skolegeni/"]
  }
);
