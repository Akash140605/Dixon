// Local SQLite database for Dixon (replaces the external kushalyouth.com MySQL DB).
// Uses Node's built-in `node:sqlite` module, so no extra npm package is needed (Node 22.13+).
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedDatabase } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH =
  process.env.DIXON_DB_PATH || path.join(__dirname, "data", "dixon.sqlite");

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS production_entries_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entryId TEXT NULL,
  hall TEXT NOT NULL,
  machine TEXT NULL,
  machineCode TEXT NOT NULL,
  machineName TEXT NULL,
  machineDisplayName TEXT NULL,
  date TEXT NOT NULL,
  shift TEXT NOT NULL,
  shiftLabel TEXT NULL,
  hour TEXT NULL,
  duration TEXT NOT NULL,
  operatorId TEXT NULL,
  operator TEXT NULL,
  part TEXT NULL,
  partNumber TEXT NULL,
  partCategory TEXT NULL,
  standardCycleTime REAL DEFAULT 0,
  actualCycleTime REAL DEFAULT 0,
  target REAL DEFAULT 0,
  actual REAL DEFAULT 0,
  good REAL DEFAULT 0,
  reject REAL DEFAULT 0,
  lossTime REAL DEFAULT 0,
  lossTimeMinutes REAL DEFAULT 0,
  rejectReason TEXT NULL,
  rejectBreakdown TEXT DEFAULT '[]',
  lossTimeBreakdown TEXT DEFAULT '[]',
  responsibilities TEXT DEFAULT '[]',
  remarks TEXT NULL,
  isNewOperator INTEGER DEFAULT 0,
  createdAt TEXT NULL,
  updatedAt TEXT NULL
);
CREATE INDEX IF NOT EXISTS idx_entries_date ON production_entries_v2(date);

CREATE TABLE IF NOT EXISTS parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_name TEXT NOT NULL UNIQUE,
  part_number TEXT NULL,
  prod_cat TEXT NULL,
  machine TEXT NULL,
  cycle_time REAL DEFAULT 0
);
`;

let dbInstance = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(SCHEMA_SQL);

  const { n } = db.prepare("SELECT COUNT(*) AS n FROM parts").get();
  if (n === 0) {
    console.log("[db] Empty database found, inserting dummy data...");
    seedDatabase(db);
  }

  dbInstance = db;
  return db;
}

export function resetDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  if (fs.existsSync(DB_PATH)) fs.rmSync(DB_PATH);
  return getDb();
}
