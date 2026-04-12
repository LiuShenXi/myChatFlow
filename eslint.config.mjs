import path from "node:path"
import { fileURLToPath } from "node:url"
import { FlatCompat } from "@eslint/eslintrc"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname
})

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      ".worktrees/**",
      "out/**",
      "build/**",
      "next-env.d.ts"
    ]
  },
  {
    files: ["scripts/**/*.cjs", "__tests__/scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  }
]

export default config
