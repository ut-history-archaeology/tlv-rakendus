import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  // komponentide renderdustestid (nt PA-02 jalus) vajavad React 17+ JSX-teisendust
  esbuild: { jsx: "automatic" },
  test: {
    include: ["lib/**/*.test.ts"],
  },
});
