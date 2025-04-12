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
    rules: {
      // Allow @ts-expect-error, disable ban
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": false, // ✅ allow this
          "ts-ignore": false, // or true if you still want to ban it
          "ts-nocheck": true,
          "ts-check": false,
        },
      ],
    },
  },
];

export default eslintConfig;
