import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"], // Generate ESM & CommonJS
  dts: true, // Generate .d.ts files
  splitting: false,
  sourcemap: true,
  clean: true,
});
