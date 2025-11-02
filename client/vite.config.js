import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  root: __dirname,
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: "public/manifest.json", dest: "." },
        { src: "public/background.js", dest: "." },
        { src: "public/ScrapedData", dest: "ScrapedData" },
      ],
    }),
  ],
  build: {
    outDir: "../build",
    emptyOutDir: true,
  },
});
