import { defineConfig } from "vite";
export default defineConfig({
  clearScreen: false,
  server: {
    host: "127.0.0.1",
    // Not Vite's 5173: keep this app off other local Vite projects.
    port: 33223,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
