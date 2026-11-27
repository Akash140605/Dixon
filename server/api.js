// Node port of api/entriesv2.php + api/get_parts.php, backed by the local SQLite DB.
// Same URLs and the same JSON response shape, so the React app works unchanged.
import { getDb } from "./db.js";

const JSON_FIELDS = ["rejectBreakdown", "lossTimeBreakdown", "responsibilities"];

const COLUMNS = [
  "entryId", "hall", "machine", "machineCode", "machineName", "machineDisplayName", "date",
  "shift", "shiftLabel", "hour", "duration", "operatorId", "operator", "part", "partNumber",
  "partCategory", "standardCycleTime", "actualCycleTime", "target", "actual", "good", "reject",
  "lossTime", "lossTimeMinutes", "rejectReason", "rejectBreakdown", "lossTimeBreakdown",
  "responsibilities", "remarks", "isNewOperator", "createdAt", "updatedAt",
];

const cleanText = (v) => String(v ?? "").trim();
const cleanNullable = (v) => (cleanText(v) === "" ? null : cleanText(v));
const cleanNumber = (v, d = 0) =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? d : Number(v);
const cleanArray = (v) => {
  if (typeof v === "string") {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return Array.isArray(v) ? v : [];
};

function normalizeShift(shift) {
  const v = cleanText(shift).toLowerCase();
  if (v === "a" || v === "shift a") return "Shift A";
  if (v === "b" || v === "shift b") return "Shift B";
  if (v === "c" || v === "shift c") return "Shift C";
  return cleanText(shift);
}

function nowString() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function normalizeEntryInput(input) {
  const actual = cleanNumber(input.actual);
  const reject = cleanNumber(input.reject);
  const target = cleanNumber(input.target);
  return {
    entryId: cleanNullable(input.entryId),
    hall: cleanText(input.hall),
    machine: cleanNullable(input.machine),
    machineCode: cleanText(input.machineCode),
    machineName: cleanNullable(input.machineName),
    machineDisplayName: cleanNullable(input.machineDisplayName),
    date: cleanText(input.date),
    shift: normalizeShift(input.shift),
    shiftLabel: cleanNullable(input.shiftLabel),
    hour: cleanNullable(input.hour),
    duration: cleanText(input.duration ?? input.hour),
    operatorId: cleanNullable(input.operatorId),
    operator: cleanNullable(input.operator),
    part: cleanNullable(input.part),
    partNumber: cleanNullable(input.partNumber),
    partCategory: cleanNullable(input.partCategory),
    standardCycleTime: cleanNumber(input.standardCycleTime),
    actualCycleTime: cleanNumber(input.actualCycleTime),
    target,
    actual,
    good: cleanNumber(input.good ?? Math.max(actual - reject, 0)),
    reject,
    lossTime: cleanNumber(input.lossTime ?? Math.max(target - actual, 0)),
    lossTimeMinutes: cleanNumber(input.lossTimeMinutes ?? input.lossMinutes ?? 0),
    rejectReason: cleanNullable(input.rejectReason),
    rejectBreakdown: cleanArray(input.rejectBreakdown),
    lossTimeBreakdown: cleanArray(input.lossTimeBreakdown),
    responsibilities: cleanArray(input.responsibilities),
    remarks: cleanNullable(input.remarks),
    isNewOperator: input.isNewOperator ? 1 : 0,
    createdAt: cleanNullable(input.createdAt),
    updatedAt: cleanNullable(input.updatedAt),
  };
}

function validateEntry(e) {
  const errors = [];
  if (!e.hall) errors.push("Hall is required");
  if (!e.machineCode) errors.push("Machine code is required");
  if (!e.date) errors.push("Date is required");
  if (!e.shift) errors.push("Shift is required");
  if (!e.duration) errors.push("Duration is required");
  if (e.date && !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) errors.push("Date must be in YYYY-MM-DD format");
  if (!["Shift A", "Shift B", "Shift C"].includes(e.shift)) errors.push("Shift must be Shift A, Shift B or Shift C");
  for (const k of ["target", "actual", "good", "reject", "lossTime", "lossTimeMinutes"]) {
    if (e[k] < 0) errors.push(`${k} cannot be negative`);
  }
  if (e.good > e.actual) errors.push("Good quantity cannot be greater than actual quantity");
  if (e.reject > e.actual) errors.push("Reject quantity cannot be greater than actual quantity");
  return errors;
}

function decodeRow(row) {
  if (!row) return null;
  const out = { ...row };
  for (const f of JSON_FIELDS) {
    try { out[f] = JSON.parse(row[f] || "[]") || []; } catch { out[f] = []; }
  }
  return out;
}

const toParams = (e) =>
  COLUMNS.map((c) => (JSON_FIELDS.includes(c) ? JSON.stringify(e[c] || []) : e[c] ?? null));

const getById = (db, id) =>
  decodeRow(db.prepare("SELECT * FROM production_entries_v2 WHERE id = ?").get(id));

class HttpError extends Error {
  constructor(status, payload) { super(payload.message); this.status = status; this.payload = payload; }
}

function handleEntries(method, query, body) {
  const db = getDb();

  if (method === "GET") {
    const id = Number(query.get("id") || 0);
    if (id > 0) {
      const row = getById(db, id);
      if (!row) throw new HttpError(404, { success: false, message: "Entry not found" });
      return [200, { success: true, data: row }];
    }
    const rows = db
      .prepare("SELECT * FROM production_entries_v2 ORDER BY date DESC, id DESC")
      .all()
      .map(decodeRow);
    return [200, { success: true, count: rows.length, data: rows }];
  }

  if (method === "POST" || method === "PUT") {
    const entry = normalizeEntryInput(body);
    const errors = validateEntry(entry);
    if (errors.length) {
      throw new HttpError(422, { success: false, message: "Validation failed", errors });
    }

    if (method === "POST") {
      const now = nowString();
      entry.createdAt = entry.createdAt || now;
      entry.updatedAt = entry.updatedAt || now;
      const result = db
        .prepare(`INSERT INTO production_entries_v2 (${COLUMNS.join(", ")}) VALUES (${COLUMNS.map(() => "?").join(", ")})`)
        .run(...toParams(entry));
      return [201, { success: true, message: "Entry created successfully", data: getById(db, Number(result.lastInsertRowid)) }];
    }

    const id = Number(body.id || 0);
    if (id <= 0) throw new HttpError(400, { success: false, message: "Valid entry ID is required" });
    const existing = getById(db, id);
    if (!existing) throw new HttpError(404, { success: false, message: "Entry not found" });
    entry.createdAt = entry.createdAt || existing.createdAt || nowString();
    entry.updatedAt = nowString();
    db.prepare(`UPDATE production_entries_v2 SET ${COLUMNS.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`)
      .run(...toParams(entry), id);
    return [200, { success: true, message: "Entry updated successfully", data: getById(db, id) }];
  }

  if (method === "DELETE") {
    const id = Number(query.get("id") || body.id || 0);
    if (id <= 0) throw new HttpError(400, { success: false, message: "Valid entry ID is required" });
    if (!getById(db, id)) throw new HttpError(404, { success: false, message: "Entry not found" });
    db.prepare("DELETE FROM production_entries_v2 WHERE id = ?").run(id);
    return [200, { success: true, message: "Entry deleted successfully", deletedId: id }];
  }

  return [405, { success: false, message: "Method not allowed" }];
}

function handleParts() {
  const rows = getDb().prepare("SELECT * FROM parts ORDER BY part_name").all();
  return [200, { success: true, count: rows.length, data: rows }];
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      if (!raw.trim()) return resolve({});
      try { const d = JSON.parse(raw); resolve(d && typeof d === "object" ? d : {}); }
      catch { reject(new HttpError(400, { success: false, message: "Invalid JSON payload" })); }
    });
    req.on("error", reject);
  });
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Content-Type", "application/json; charset=UTF-8");
  res.end(payload === undefined ? "" : JSON.stringify(payload));
}

// Connect-style middleware: (req, res, next). Handles /api/entriesv2.php and /api/get_parts.php.
export async function apiMiddleware(req, res, next) {
  const url = new URL(req.url, "http://localhost");
  const route = url.pathname.replace(/\/+$/, "");
  const isEntries = route === "/api/entriesv2.php" || route === "/api/entries";
  const isParts = route === "/api/get_parts.php" || route === "/api/parts";

  if (!isEntries && !isParts) return next ? next() : send(res, 404, { success: false, message: "Not found" });
  if (req.method === "OPTIONS") return send(res, 200);

  try {
    let result;
    if (isParts) {
      result = handleParts();
    } else {
      const body = ["POST", "PUT", "DELETE"].includes(req.method) ? await readBody(req) : {};
      result = handleEntries(req.method, url.searchParams, body);
    }
    send(res, result[0], result[1]);
  } catch (err) {
    if (err instanceof HttpError) return send(res, err.status, err.payload);
    console.error("[api] Error:", err);
    send(res, 500, { success: false, message: err.message || "Server error" });
  }
}
