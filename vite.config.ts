import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  build: {
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
  test: {
    environment: "jsdom",
    exclude: ["dist/**", "node_modules/**", "tests/e2e/**"],
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
});
