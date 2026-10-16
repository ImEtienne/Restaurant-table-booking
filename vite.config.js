import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const target = new URL(env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").origin;
  return {
  server: {
    proxy: {
      "/api/admin": { target, changeOrigin: true },
      "/api/login": { target, changeOrigin: true },
      "/api/logout": { target, changeOrigin: true },
      "/api/profile": { target, changeOrigin: true },
      "/sanctum/csrf-cookie": { target, changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        login: fileURLToPath(new URL("./login.html", import.meta.url)),
        register: fileURLToPath(new URL("./register.html", import.meta.url)),
        dashboard: fileURLToPath(new URL("./dashboard.html", import.meta.url)),
      },
    },
  },
  };
});
