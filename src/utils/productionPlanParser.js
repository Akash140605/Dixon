export const HOURLY_KEYS = [
  "08 ~ 09",
  "09 ~ 10",
  "10 ~ 11",
  "11 ~ 12",
  "12 ~ 13",
  "13 ~ 14",
  "14 ~ 15",
  "15 ~ 16",
  "16 ~ 17",
  "17 ~ 18",
  "18 ~ 19",
  "19 ~ 20",
];

export const HOURLY_FIELD_MAP = {
  "08 ~ 09": "h08_09",
  "09 ~ 10": "h09_10",
  "10 ~ 11": "h10_11",
  "11 ~ 12": "h11_12",
  "12 ~ 13": "h12_13",
  "13 ~ 14": "h13_14",
  "14 ~ 15": "h14_15",
  "15 ~ 16": "h15_16",
  "16 ~ 17": "h16_17",
  "17 ~ 18": "h17_18",
  "18 ~ 19": "h18_19",
  "19 ~ 20": "h19_20",
};

export const DEFAULT_PRODUCTION_DATE = "2026-06-04";

export function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/#DIV\/0!/gi, "")
    .trim();

  if (!cleaned) return 0;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function safePercent(numerator, denominator, decimals = 2) {
  const n = toNumber(numerator);
  const d = toNumber(denominator);
  if (!d || d <= 0) return 0;
  return Number(((n / d) * 100).toFixed(decimals));
}

export function formatNumber(value) {
  return toNumber(value).toLocaleString("en-IN");
}

export function getHourlyFields(record = {}) {
  return HOURLY_KEYS.map((slot) => ({
    slot,
    field: HOURLY_FIELD_MAP[slot],
    value: toNumber(record[HOURLY_FIELD_MAP[slot]]),
  }));
}

export function getHourlyTotal(record = {}) {
  return getHourlyFields(record).reduce((sum, item) => sum + toNumber(item.value), 0);
}

export function createEmptyHourlyObject() {
  return Object.values(HOURLY_FIELD_MAP).reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
}

export function createBaseMachineRecord(overrides = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date: DEFAULT_PRODUCTION_DATE,
    hall: "",
    machineName: "",
    partName: "",
    model: "",
    itemCode: "",
    description: "",
    ct: 0,
    rowType: "Target",
    total: 0,
    actualTotal: 0,
    rejectionTotal: 0,
    achievementPercent: 0,
    rejectionPercent: 0,
    remarks: "",
    ...createEmptyHourlyObject(),
    ...overrides,
  };
}

export function normalizeMachineRecord(record = {}) {
  const normalized = {
    ...createBaseMachineRecord(),
    ...record,
  };

  normalized.date = record.date || DEFAULT_PRODUCTION_DATE;
  normalized.hall = String(record.hall || "").trim();
  normalized.machineName = String(record.machineName || "").trim();
  normalized.partName = String(record.partName || "").trim();
  normalized.model = String(record.model || "").trim();
  normalized.itemCode = String(record.itemCode || "").trim();
  normalized.description = String(record.description || "").trim();
  normalized.ct = toNumber(record.ct);

  Object.values(HOURLY_FIELD_MAP).forEach((field) => {
    normalized[field] = toNumber(record[field]);
  });

  normalized.total =
    toNumber(record.total) > 0 ? toNumber(record.total) : getHourlyTotal(normalized);

  normalized.actualTotal = toNumber(record.actualTotal);
  normalized.rejectionTotal = toNumber(record.rejectionTotal);

  normalized.achievementPercent =
    toNumber(record.achievementPercent) > 0
      ? toNumber(record.achievementPercent)
      : safePercent(normalized.actualTotal, normalized.total);

  normalized.rejectionPercent =
    toNumber(record.rejectionPercent) > 0
      ? toNumber(record.rejectionPercent)
      : safePercent(normalized.rejectionTotal, normalized.actualTotal);

  return normalized;
}

export function buildMachineSummary(targetRecord, actualRecord = {}, rejectionRecord = {}) {
  const base = normalizeMachineRecord(targetRecord);

  const actualNormalized = {
    ...createEmptyHourlyObject(),
    ...actualRecord,
  };

  const rejectionNormalized = {
    ...createEmptyHourlyObject(),
    ...rejectionRecord,
  };

  const hourlyActual = {};
  const hourlyReject = {};
  const hourlyTarget = {};

  Object.entries(HOURLY_FIELD_MAP).forEach(([slot, field]) => {
    hourlyTarget[field] = toNumber(base[field]);
    hourlyActual[field] = toNumber(actualNormalized[field]);
    hourlyReject[field] = toNumber(rejectionNormalized[field]);
  });

  const totalTarget = getHourlyTotal(hourlyTarget);
  const totalActual =
    toNumber(actualRecord.total) > 0 ? toNumber(actualRecord.total) : getHourlyTotal(hourlyActual);
  const totalReject =
    toNumber(rejectionRecord.total) > 0
      ? toNumber(rejectionRecord.total)
      : getHourlyTotal(hourlyReject);

  return normalizeMachineRecord({
    ...base,
    ...hourlyTarget,
    total: totalTarget,
    actualTotal: totalActual,
    rejectionTotal: totalReject,
    achievementPercent: safePercent(totalActual, totalTarget),
    rejectionPercent: safePercent(totalReject, totalActual),
  });
}

export function convertSummaryToHourlyTable(summaryRows = []) {
  const table = [];

  summaryRows.forEach((row) => {
    HOURLY_KEYS.forEach((slot) => {
      const field = HOURLY_FIELD_MAP[slot];
      table.push({
        id: `${row.id}-${field}`,
        date: row.date || DEFAULT_PRODUCTION_DATE,
        hall: row.hall,
        machine: row.machineName,
        machineName: row.machineName,
        machineCode: row.itemCode,
        part: row.partName,
        model: row.model,
        ct: row.ct,
        hour: slot,
        target: toNumber(row[field]),
        actual: 0,
        good: 0,
        reject: 0,
        lossTime: 0,
        lossMinutes: 0,
        operator: "",
        operatorId: "",
        remarks: "",
      });
    });
  });

  return table;
}

export function applyActualsToHourlyTable(hourlyTable = [], actualMap = {}) {
  return hourlyTable.map((row) => {
    const key = [
      row.hall,
      row.machineName || row.machine,
      row.part,
      row.model,
      row.hour,
    ]
      .map((v) => String(v || "").trim().toLowerCase())
      .join("||");

    const actual = toNumber(actualMap[key]?.actual || 0);
    const reject = toNumber(actualMap[key]?.reject || 0);
    const good = Math.max(actual - reject, 0);
    const lossTime = Math.max(toNumber(row.target) - actual, 0);
    const lossMinutes =
      row.ct > 0 ? Number(((lossTime * toNumber(row.ct)) / 60).toFixed(2)) : 0;

    return {
      ...row,
      actual,
      reject,
      good,
      lossTime,
      lossMinutes,
    };
  });
}

export function groupHourlyByMachine(hourlyTable = []) {
  const grouped = {};

  hourlyTable.forEach((row) => {
    const key = [
      row.hall,
      row.machineName || row.machine,
      row.part,
      row.model,
    ]
      .map((v) => String(v || "").trim())
      .join("||");

    if (!grouped[key]) {
      grouped[key] = {
        hall: row.hall || "",
        machine: row.machineName || row.machine || "",
        machineCode: row.machineCode || row.itemCode || "",
        machineName: row.machineName || row.machine || "",
        part: row.part || "",
        model: row.model || "",
        ct: toNumber(row.ct),
        shift: "",
        operator: "",
        operatorId: "",
        data: [],
      };
    }

    grouped[key].data.push({
      ...row,
      target: toNumber(row.target),
      actual: toNumber(row.actual),
      good: toNumber(row.good),
      reject: toNumber(row.reject),
      lossTime: toNumber(row.lossTime),
      lossMinutes: toNumber(row.lossMinutes),
    });
  });

  Object.values(grouped).forEach((machine) => {
    machine.data.sort(
      (a, b) =>
        HOURLY_KEYS.indexOf(a.hour) - HOURLY_KEYS.indexOf(b.hour)
    );
  });

  return Object.values(grouped);
}

export function buildDayWiseTrend(hourlyTable = []) {
  const grouped = {};

  hourlyTable.forEach((row) => {
    const date = row.date || DEFAULT_PRODUCTION_DATE;
    if (!grouped[date]) {
      grouped[date] = {
        date,
        actual: 0,
        good: 0,
        reject: 0,
        target: 0,
        lossQty: 0,
        lossMinutes: 0,
      };
    }

    grouped[date].actual += toNumber(row.actual);
    grouped[date].good += toNumber(row.good);
    grouped[date].reject += toNumber(row.reject);
    grouped[date].target += toNumber(row.target);
    grouped[date].lossQty += toNumber(row.lossTime);
    grouped[date].lossMinutes += toNumber(row.lossMinutes);
  });

  return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
}