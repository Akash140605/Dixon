export function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatNumber(value) {
  return toNumber(value).toLocaleString("en-IN");
}

export function slugifyMachineName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeMachineName(item = {}) {
  return (
    item.machineDisplayName ||
    item.machine ||
    item.machineName ||
    item.machineCode ||
    "Unknown Machine"
  );
}

export function normalizePartName(item = {}) {
  return (
    item.part ||
    item.partName ||
    item.item ||
    item.itemName ||
    "Unknown Part"
  );
}

export function getHallLabelFromId(hallId) {
  const normalized = String(hallId || "").trim().toLowerCase();

  if (!normalized) return "";

  if (normalized === "c8") return "Hall 5";
  if (normalized === "hall-1" || normalized === "hall 1" || normalized === "h1") return "Hall 1";
  if (normalized === "hall-2" || normalized === "hall 2" || normalized === "h2") return "Hall 2";
  if (normalized === "hall-3" || normalized === "hall 3" || normalized === "h3") return "Hall 3";
  if (normalized === "hall-4" || normalized === "hall 4" || normalized === "h4") return "Hall 4";

  return String(hallId)
    .replace(/^hall-?/i, "Hall ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function hallLabelToId(hallLabel) {
  return String(hallLabel || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export function readLocalProductionData() {
  try {
    const raw =
      localStorage.getItem("productionData") ||
      localStorage.getItem("production-dashboard-data") ||
      localStorage.getItem("dashboardData") ||
      localStorage.getItem("productionEntries");

    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeDateValue(value) {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsedFromString = new Date(trimmed);
    if (!Number.isNaN(parsedFromString.getTime())) {
      return parsedFromString.toISOString().slice(0, 10);
    }

    return trimmed;
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return "";
}

function normalizeShiftValue(value) {
  const raw = String(value || "").trim().toUpperCase();

  if (!raw) return "";

  if (raw === "A" || raw === "SHIFT A" || raw === "SHIFT 1" || raw === "1") {
    return "A";
  }

  if (raw === "B" || raw === "SHIFT B" || raw === "SHIFT 2" || raw === "2") {
    return "B";
  }

  if (raw === "C" || raw === "SHIFT C" || raw === "SHIFT 3" || raw === "3") {
    return "C";
  }

  return raw.replace(/^SHIFT\s*/i, "").trim();
}

function getShiftLabel(shift) {
  const code = normalizeShiftValue(shift);
  return code ? `Shift ${code}` : "";
}

function getDateFromAny(row = {}, block = {}) {
  return normalizeDateValue(
    row.date ||
      row.productionDate ||
      row.entryDate ||
      row.selectedDate ||
      row.createdAt ||
      row.updatedAt ||
      row.day ||
      block.date ||
      block.productionDate ||
      block.entryDate ||
      block.selectedDate ||
      block.createdAt ||
      block.updatedAt ||
      ""
  );
}

function getShiftFromAny(row = {}, block = {}) {
  const shift = normalizeShiftValue(
    row.shift ||
      row.shiftCode ||
      row.shiftLabel ||
      row.selectedShift ||
      block.shift ||
      block.shiftCode ||
      block.shiftLabel ||
      block.selectedShift ||
      ""
  );

  return {
    shift,
    shiftLabel: getShiftLabel(shift),
  };
}

function getOperatorFromAny(row = {}, block = {}) {
  return normalizeText(
    row.operator ||
      row.operatorName ||
      row.name ||
      block.operator ||
      block.operatorName ||
      block.name ||
      ""
  );
}

function getOperatorIdFromAny(row = {}, block = {}) {
  return normalizeText(
    row.operatorId ||
      row.operatorID ||
      row.operatorCode ||
      row.empId ||
      row.employeeId ||
      row.employeeCode ||
      block.operatorId ||
      block.operatorID ||
      block.operatorCode ||
      block.empId ||
      block.employeeId ||
      block.employeeCode ||
      ""
  );
}

function getPartFromAny(row = {}, block = {}) {
  return normalizePartName({
    part:
      row.part ||
      row.partName ||
      row.item ||
      row.itemName ||
      block.part ||
      block.partName ||
      block.item ||
      block.itemName,
  });
}

function getHourFromAny(row = {}, block = {}) {
  return normalizeText(
    row.hour ||
      row.label ||
      row.slot ||
      row.duration ||
      row.time ||
      row.timeSlot ||
      block.hour ||
      block.label ||
      block.slot ||
      ""
  );
}

function getLossQtyFromAny(row = {}, block = {}) {
  return toNumber(
    row.lossQty ??
      row.lossTime ??
      row.loss ??
      block.lossQty ??
      block.lossTime ??
      block.loss ??
      0
  );
}

function getLossMinutesFromAny(row = {}, block = {}) {
  return toNumber(
    row.lossMinutes ??
      row.lossTimeMinutes ??
      row.lossMin ??
      row.downtimeMinutes ??
      row.lossTime ??
      block.lossMinutes ??
      block.lossTimeMinutes ??
      block.lossMin ??
      block.downtimeMinutes ??
      block.lossTime ??
      0
  );
}

function getRejectReasonText(row = {}) {
  if (row.rejectBreakdownText) return normalizeText(row.rejectBreakdownText);
  if (row.rejectReason) return normalizeText(row.rejectReason);

  if (Array.isArray(row.rejectBreakdown) && row.rejectBreakdown.length > 0) {
    return row.rejectBreakdown
      .map((item) => `${item?.reason || "Other"}: ${toNumber(item?.qty)}`)
      .join(", ");
  }

  return "";
}

function getRemarksFromAny(row = {}, block = {}) {
  return normalizeText(
    row.remarks ||
      row.comment ||
      row.comments ||
      row.notes ||
      block.remarks ||
      block.comment ||
      block.comments ||
      block.notes ||
      ""
  );
}

function buildNormalizedMachineRow(row = {}, block = {}, index = 0) {
  const actual = toNumber(row.actual);
  const reject = toNumber(row.reject);
  const machine = normalizeMachineName({
    machineDisplayName:
      row.machineDisplayName ||
      row.machine ||
      row.machineName ||
      block.machineDisplayName ||
      block.machine ||
      block.machineName,
    machineCode: row.machineCode || block.machineCode,
  });

  const date = getDateFromAny(row, block);
  const { shift, shiftLabel } = getShiftFromAny(row, block);
  const hour = getHourFromAny(row, block);
  const operator = getOperatorFromAny(row, block);
  const operatorId = getOperatorIdFromAny(row, block);

  return {
    id:
      row.id ||
      row.entryId ||
      `${slugifyMachineName(machine)}-${date || "na"}-${shift || "na"}-${hour || index}`,
    hour: hour || "Unknown",
    duration: hour || "Unknown",
    hall: normalizeText(row.hall || block.hall || ""),
    machine,
    part: getPartFromAny(row, block),
    operator,
    operatorId,
    date,
    shift,
    shiftLabel,
    actual,
    good: toNumber(row.good ?? actual - reject),
    reject,
    target: toNumber(row.target),
    lossQty: getLossQtyFromAny(row, block),
    lossMinutes: getLossMinutesFromAny(row, block),
    lossTimeMinutes: getLossMinutesFromAny(row, block),
    rejectReason: normalizeText(row.rejectReason || ""),
    rejectBreakdown: Array.isArray(row.rejectBreakdown) ? row.rejectBreakdown : [],
    rejectBreakdownText: getRejectReasonText(row),
    lossTimeBreakdown: Array.isArray(row.lossTimeBreakdown) ? row.lossTimeBreakdown : [],
    remarks: getRemarksFromAny(row, block),
    createdAt: row.createdAt || row.updatedAt || row.date || block.createdAt || block.date || "",
  };
}

export function buildMachineRows(machineHourlyTrend = [], hourlyTable = []) {
  const rows = [];

  if (Array.isArray(machineHourlyTrend) && machineHourlyTrend.length) {
    machineHourlyTrend.forEach((machineBlock, blockIndex) => {
      if (Array.isArray(machineBlock?.data) && machineBlock.data.length) {
        machineBlock.data.forEach((row, rowIndex) => {
          rows.push(
            buildNormalizedMachineRow(row, machineBlock, `${blockIndex}-${rowIndex}`)
          );
        });
      } else {
        rows.push(buildNormalizedMachineRow(machineBlock, machineBlock, blockIndex));
      }
    });
  }

  if (!rows.length && Array.isArray(hourlyTable) && hourlyTable.length) {
    hourlyTable.forEach((row, index) => {
      rows.push(buildNormalizedMachineRow(row, {}, index));
    });
  }

  return rows;
}