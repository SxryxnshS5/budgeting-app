import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API calls to the Python backend during development
    proxy: {
      "/receipts": "http://127.0.0.1:8000",
      "/insights": "http://127.0.0.1:8000",
    },
  },
});
