import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

// Serves the local API (SQLite dummy database in server/data/dixon.sqlite)
// from the same dev server, so `npm run dev` is the only command needed.
function localApiPlugin() {
  const attach = async (server) => {
    const { apiMiddleware } = await import("./server/api.js");
    const { getDb } = await import("./server/db.js");
    getDb();
    server.middlewares.use(apiMiddleware);
  };
  return {
    name: "dixon-local-api",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApiPlugin()],
  server: {
    host: "localhost",
    port: 5173,
  },
});
