// Standalone API server (optional). `npm run dev` already serves the API through Vite,
// use this only if you want the backend on its own port: `npm run server`.
import http from "node:http";
import { apiMiddleware } from "./api.js";
import { getDb, DB_PATH } from "./db.js";

const PORT = Number(process.env.PORT || 8000);
getDb();

http
  .createServer((req, res) => apiMiddleware(req, res))
  .listen(PORT, () => {
    console.log(`Dixon local API running at http://localhost:${PORT}/api/entriesv2.php`);
    console.log(`Database file: ${DB_PATH}`);
  });
