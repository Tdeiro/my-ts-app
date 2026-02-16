import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/login": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      "/events": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      "/dashboard": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      "/swagger-ui": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      "/v3/api-docs": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      "/actuator": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
