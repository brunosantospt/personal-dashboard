import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base /admin/ -> os assets do build resolvem sob https://dominio/admin/
export default defineConfig({
  base: "/admin/",
  plugins: [react(), tailwindcss()],
  build: { outDir: "dist" },
  server: {
    // Em dev (npm run dev), proxy das chamadas ao backend FastAPI.
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/photos": "http://127.0.0.1:8000",
      "/ws": { target: "ws://127.0.0.1:8000", ws: true },
    },
  },
});
