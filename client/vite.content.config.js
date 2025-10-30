import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  build: {
    outDir: "../build",
    emptyOutDir: false,
    lib: {
      entry: `${__dirname}/src/components/contentScript.jsx`,
      name: "contentScript",
      fileName: () => "contentScript.js",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
