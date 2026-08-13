import { defineConfig } from "vitest/config";

export default defineConfig({
  // A relative base keeps the build portable across GitHub Pages,
  // Netlify, Vercel and itch.io without reconfiguration.
  base: "./",
  build: {
    target: "es2022",
    modulePreload: { polyfill: false },
    assetsInlineLimit: 100_000,
    reportCompressedSize: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
