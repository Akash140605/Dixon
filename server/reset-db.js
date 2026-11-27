// Deletes the local database and recreates it with fresh dummy data: `npm run db:reset`
import { resetDb, DB_PATH } from "./db.js";
resetDb();
console.log(`Fresh dummy database created at ${DB_PATH}`);
