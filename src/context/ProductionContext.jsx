import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initialDashboardData, STORAGE_KEY } from "../data/initialData";

const ProductionContext = createContext(null);

const initialFilters = {
  date: "",
  hall: "",
  shift: "",
  machine: "",
  operator: "",
  operatorId: "",
  rejectReason: "",
};

function createEntryId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function uniqueSorted(values = []) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b))
  );
}

function normalizeShiftCode(shiftValue = "") {
  const value = String(shiftValue || "").trim().toUpperCase();

  if (!value) return "";

  if (value === "A" || value === "SHIFT A" || value === "SHIFT 1" || value === "1") {
    return "A";
  }

  if (value === "B" || value === "SHIFT B" || value === "SHIFT 2" || value === "2") {
    return "B";
  }

  if (value === "C" || value === "SHIFT C" || value === "SHIFT 3" || value === "3") {
    return "C";
  }

  return value.replace(/^SHIFT\s+/i, "").trim();
}

function getShiftLabel(shiftCode = "") {
  const code = normalizeShiftCode(shiftCode);
  return code ? `Shift ${code}` : "";
}

function getCurrentShiftCode(now = new Date()) {
  const hours = now.getHours();
  if (hours >= 6 && hours < 14) return "A";
  if (hours >= 14 && hours < 22) return "B";
  return "C";
}

function parseHourLabel(hourLabel = "") {
  const value = String(hourLabel || "").trim().toUpperCase();
  const firstPart = value.split("-")[0]?.trim() || "";
  const match = firstPart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/);

  if (!match) return Number.MAX_SAFE_INTEGER;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3];

  if (period === "AM" && hours === 12) hours = 0;
  if (period === "PM" && hours !== 12) hours += 12;

  return hours * 60 + minutes;
}

function formatDisplayDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function normalizeRejectBreakdown(breakdown = []) {
  if (!Array.isArray(breakdown)) return [];
  return breakdown
    .map((item) => ({
      id: item?.id || createEntryId(),
      reason: item?.reason || "",
      qty: Number(item?.qty || 0),
    }))
    .filter((item) => item.reason && item.qty > 0);
}

function normalizeLossTimeBreakdown(lossTimeBreakdown = []) {
  if (!Array.isArray(lossTimeBreakdown)) return [];
  return lossTimeBreakdown
    .map((item) => ({
      id: item?.id || createEntryId(),
      reason: String(item?.reason || "").trim(),
      qty: Number(item?.qty || 0),
      minutes: Number(item?.minutes || 0),
      person: String(item?.person || item?.name || "").trim(),
      department: String(item?.department || "").trim(),
    }))
    .filter((item) => item.reason && (item.qty > 0 || item.minutes > 0));
}

function normalizeResponsibilities(responsibilities = [], lossTimeBreakdown = []) {
  if (Array.isArray(responsibilities) && responsibilities.length > 0) {
    return responsibilities
      .map((item) => ({
        person: item?.person || item?.name || "",
        department: item?.department || "",
      }))
      .filter((item) => item.person);
  }

  if (Array.isArray(lossTimeBreakdown) && lossTimeBreakdown.length > 0) {
    return lossTimeBreakdown
      .map((item) => ({
        person: item?.person || "",
        department: item?.department || "",
      }))
      .filter((item) => item.person);
  }

  return [];
}

function buildRejectReasonText(rejectBreakdown = [], rejectReason = "") {
  if (Array.isArray(rejectBreakdown) && rejectBreakdown.length > 0) {
    return rejectBreakdown.map((item) => `${item.reason}: ${item.qty}`).join(", ");
  }
  return rejectReason || "";
}

function buildResponsibilitiesText(responsibilities = []) {
  if (!Array.isArray(responsibilities) || responsibilities.length === 0) return "";
  return responsibilities
    .map((item) => (item.department ? `${item.person} (${item.department})` : item.person))
    .join(", ");
}

function buildLossTimeBreakdownText(lossTimeBreakdown = []) {
  if (!Array.isArray(lossTimeBreakdown) || lossTimeBreakdown.length === 0) return "";
  return lossTimeBreakdown
    .map((item) => {
      const reason = item.reason || "Unknown";
      const qty = Number(item.qty || 0);
      const minutes = Number(item.minutes || 0);
      const person = item.person
        ? item.department
          ? ` - ${item.person} (${item.department})`
          : ` - ${item.person}`
        : "";
      return `${reason}: Qty ${qty}, ${minutes} min${person}`;
    })
    .join(", ");
}

function getMachineDisplay(row = {}) {
  if (typeof row.machineDisplayName === "string" && row.machineDisplayName.trim()) {
    return row.machineDisplayName;
  }
  if (typeof row.machine === "string" && row.machine.trim()) return row.machine;
  if (row.machine?.displayName) return row.machine.displayName;
  if (row.machineCode && row.machineName) return `${row.machineCode} - ${row.machineName}`;
  if (row.machineCode) return row.machineCode;
  return "";
}

function normalizeHourlyRow(row = {}) {
  const normalizedBreakdown = normalizeRejectBreakdown(row.rejectBreakdown);
  const normalizedLossTimeBreakdown = normalizeLossTimeBreakdown(
    row.lossTimeBreakdown || row.responsibilities || []
  );
  const normalizedResponsibilities = normalizeResponsibilities(
    row.responsibilities,
    normalizedLossTimeBreakdown
  );

  const actual = Number(row.actual || 0);
  const target = Number(row.target || 0);
  const reject = Number(
    row.reject ?? normalizedBreakdown.reduce((sum, item) => sum + Number(item.qty || 0), 0)
  );
  const good = Number(row.good ?? Math.max(actual - reject, 0));
  const lossTime = Number(row.lossTime ?? Math.max(target - actual, 0));
  const lossTimeMinutes = Number(
    row.lossTimeMinutes ??
      normalizedLossTimeBreakdown.reduce((sum, item) => sum + Number(item.minutes || 0), 0)
  );

  const shiftCode = normalizeShiftCode(row.shift || row.shiftLabel);
  const generatedId = row.id || row.entryId || createEntryId();

  return {
    ...row,
    id: generatedId,
    entryId: row.entryId || generatedId,
    operatorId: row.operatorId || "",
    operator: row.operator || "",
    isNewOperator: Boolean(row.isNewOperator),
    shift: shiftCode,
    shiftLabel: getShiftLabel(shiftCode),
    hour: row.hour || row.duration || "",
    duration: row.duration || row.hour || "",
    actual,
    good,
    reject,
    target,
    lossTime,
    lossTimeMinutes,
    rejectReason: row.rejectReason || normalizedBreakdown[0]?.reason || "",
    rejectBreakdown: normalizedBreakdown,
    rejectBreakdownText: buildRejectReasonText(normalizedBreakdown, row.rejectReason || ""),
    responsibilities: normalizedResponsibilities,
    responsibilitiesText: buildResponsibilitiesText(normalizedResponsibilities),
    lossTimeBreakdown: normalizedLossTimeBreakdown,
    lossTimeBreakdownText: buildLossTimeBreakdownText(normalizedLossTimeBreakdown),
    remarks: row.remarks || "",
    hall: row.hall || "",
    machine: getMachineDisplay(row),
    machineDisplayName: row.machineDisplayName || getMachineDisplay(row),
    machineCode: row.machineCode || row.machine?.code || "",
    machineName: row.machineName || row.machine?.name || "",
    part: row.part || "",
    date: row.date || "",
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || "",
  };
}

function updateSummary(hourlyTable) {
  const totalProduction = hourlyTable.reduce((sum, row) => sum + Number(row.actual || 0), 0);
  const goodProduction = hourlyTable.reduce((sum, row) => sum + Number(row.good || 0), 0);
  const rejection = hourlyTable.reduce((sum, row) => sum + Number(row.reject || 0), 0);
  const targetProduction = hourlyTable.reduce((sum, row) => sum + Number(row.target || 0), 0);
  const lossTime = hourlyTable.reduce((sum, row) => sum + Number(row.lossTime || 0), 0);
  const lossTimeMinutes = hourlyTable.reduce((sum, row) => sum + Number(row.lossTimeMinutes || 0), 0);

  return {
    totalProduction,
    goodProduction,
    rejection,
    targetProduction,
    lossTime,
    lossTimeMinutes,
    lossQty: lossTime,
    lossMinutes: lossTimeMinutes,
    rejectionPercent:
      totalProduction > 0 ? ((rejection / totalProduction) * 100).toFixed(2) + "%" : "0.00%",
  };
}

function buildDayWiseTrend(hourlyTable) {
  const dayWiseMap = new Map();

  hourlyTable.forEach((row) => {
    const shortDate = formatDisplayDate(row.date);
    if (!shortDate) return;

    if (!dayWiseMap.has(shortDate)) {
      dayWiseMap.set(shortDate, {
        date: shortDate,
        actual: 0,
        production: 0,
        rejection: 0,
        reject: 0,
        target: 0,
        good: 0,
        lossTime: 0,
        lossQty: 0,
        lossMinutes: 0,
      });
    }

    const current = dayWiseMap.get(shortDate);
    current.actual += Number(row.actual || 0);
    current.production += Number(row.actual || 0);
    current.rejection += Number(row.reject || 0);
    current.reject += Number(row.reject || 0);
    current.target += Number(row.target || 0);
    current.good += Number(row.good || 0);
    current.lossTime += Number(row.lossTime || 0);
    current.lossQty += Number(row.lossTime || 0);
    current.lossMinutes += Number(row.lossTimeMinutes || 0);
  });

  return Array.from(dayWiseMap.values());
}

function buildShiftWiseProduction(hourlyTable) {
  const shiftMap = new Map();

  hourlyTable.forEach((row) => {
    const shiftKey = normalizeShiftCode(row.shiftLabel || row.shift) || "Unknown";

    if (!shiftMap.has(shiftKey)) {
      shiftMap.set(shiftKey, {
        shift: shiftKey,
        shiftLabel: getShiftLabel(shiftKey),
        actual: 0,
        rejection: 0,
        reject: 0,
        good: 0,
        target: 0,
        lossTime: 0,
        lossQty: 0,
        lossMinutes: 0,
      });
    }

    const current = shiftMap.get(shiftKey);
    current.actual += Number(row.actual || 0);
    current.rejection += Number(row.reject || 0);
    current.reject += Number(row.reject || 0);
    current.good += Number(row.good || 0);
    current.target += Number(row.target || 0);
    current.lossTime += Number(row.lossTime || 0);
    current.lossQty += Number(row.lossTime || 0);
    current.lossMinutes += Number(row.lossTimeMinutes || 0);
  });

  return Array.from(shiftMap.values());
}

function buildRejectionBreakdown(hourlyTable) {
  const rejectionMap = new Map();

  hourlyTable.forEach((row) => {
    if (Array.isArray(row.rejectBreakdown) && row.rejectBreakdown.length > 0) {
      row.rejectBreakdown.forEach((item) => {
        rejectionMap.set(item.reason, (rejectionMap.get(item.reason) || 0) + Number(item.qty || 0));
      });
    } else if (Number(row.reject) > 0 && row.rejectReason) {
      rejectionMap.set(
        row.rejectReason,
        (rejectionMap.get(row.rejectReason) || 0) + Number(row.reject || 0)
      );
    }
  });

  return Array.from(rejectionMap.entries())
    .map(([reason, value]) => ({
      reason,
      value,
    }))
    .filter((item) => item.reason && item.value > 0)
    .sort((a, b) => b.value - a.value);
}

function buildLossBreakdown(hourlyTable) {
  const lossMap = new Map();

  hourlyTable.forEach((row) => {
    if (!Array.isArray(row.lossTimeBreakdown) || row.lossTimeBreakdown.length === 0) return;

    row.lossTimeBreakdown.forEach((item) => {
      const reason = String(item.reason || "").trim();
      const qty = Number(item.qty || 0);
      const minutes = Number(item.minutes || 0);

      if (!reason) return;
      if (qty <= 0 && minutes <= 0) return;

      if (!lossMap.has(reason)) {
        lossMap.set(reason, {
          reason,
          value: 0,
          qty: 0,
          minutes: 0,
        });
      }

      const current = lossMap.get(reason);
      current.value += qty;
      current.qty += qty;
      current.minutes += minutes;
    });
  });

  return Array.from(lossMap.values())
    .filter((item) => item.reason && (item.qty > 0 || item.minutes > 0))
    .sort((a, b) => b.value - a.value);
}

function buildMachineHourlyTrend(hourlyTable) {
  const grouped = {};

  hourlyTable.forEach((row) => {
    const machineKey = `${row.date || ""}__${normalizeShiftCode(row.shiftLabel || row.shift)}__${row.hall}__${row.machine}`;

    if (!grouped[machineKey]) {
      grouped[machineKey] = {
        machine: row.machine,
        machineCode: row.machineCode || "",
        machineName: row.machineName || "",
        machineDisplayName: row.machineDisplayName || row.machine || "",
        hall: row.hall,
        date: row.date || "",
        shift: getShiftLabel(row.shift),
        shiftCode: normalizeShiftCode(row.shift),
        operatorId: row.operatorId || "",
        operator: row.operator || "",
        part: row.part,
        data: [],
      };
    }

    grouped[machineKey].data.push({
      id: row.id,
      entryId: row.entryId || row.id,
      hour: row.hour || row.duration,
      duration: row.duration || row.hour,
      sortHour: parseHourLabel(row.hour || row.duration),
      actual: Number(row.actual || 0),
      good: Number(row.good || 0),
      reject: Number(row.reject || 0),
      target: Number(row.target || 0),
      lossTime: Number(row.lossTime || 0),
      lossQty: Number(row.lossTime || 0),
      lossMinutes: Number(row.lossTimeMinutes || 0),
      shift: normalizeShiftCode(row.shiftLabel || row.shift),
      shiftLabel: getShiftLabel(normalizeShiftCode(row.shiftLabel || row.shift)),
      operatorId: row.operatorId || "",
      operator: row.operator || "",
      part: row.part,
      rejectReason: row.rejectReason || "",
      rejectBreakdown: row.rejectBreakdown || [],
      rejectBreakdownText: row.rejectBreakdownText || "",
      responsibilities: row.responsibilities || [],
      responsibilitiesText: row.responsibilitiesText || "",
      lossTimeBreakdown: row.lossTimeBreakdown || [],
      lossTimeBreakdownText: row.lossTimeBreakdownText || "",
      remarks: row.remarks || "",
      isNewOperator: Boolean(row.isNewOperator),
      date: row.date || "",
      hall: row.hall || "",
      machine: row.machine || "",
      machineCode: row.machineCode || "",
      machineName: row.machineName || "",
      machineDisplayName: row.machineDisplayName || row.machine || "",
      createdAt: row.createdAt || "",
      updatedAt: row.updatedAt || "",
    });
  });

  return Object.values(grouped)
    .map((machineItem) => ({
      ...machineItem,
      data: machineItem.data.sort((a, b) => a.sortHour - b.sortHour),
    }))
    .sort((a, b) => {
      if (a.hall !== b.hall) return a.hall.localeCompare(b.hall);
      if (a.date !== b.date) return String(a.date).localeCompare(String(b.date));
      if (a.shiftCode !== b.shiftCode) return String(a.shiftCode).localeCompare(String(b.shiftCode));
      return a.machine.localeCompare(b.machine);
    });
}

function buildHallWiseProduction(hourlyTable) {
  const hallMap = new Map();

  hourlyTable.forEach((row) => {
    if (!hallMap.has(row.hall)) {
      hallMap.set(row.hall, {
        hall: row.hall,
        actual: 0,
        good: 0,
        reject: 0,
        target: 0,
        lossTime: 0,
        lossQty: 0,
        lossMinutes: 0,
      });
    }

    const current = hallMap.get(row.hall);
    current.actual += Number(row.actual || 0);
    current.good += Number(row.good || 0);
    current.reject += Number(row.reject || 0);
    current.target += Number(row.target || 0);
    current.lossTime += Number(row.lossTime || 0);
    current.lossQty += Number(row.lossTime || 0);
    current.lossMinutes += Number(row.lossTimeMinutes || 0);
  });

  return Array.from(hallMap.values());
}

function buildOperatorWiseProduction(hourlyTable) {
  const operatorMap = new Map();

  hourlyTable.forEach((row) => {
    const operatorKey = row.operatorId || row.operator || "Unknown";

    if (!operatorMap.has(operatorKey)) {
      operatorMap.set(operatorKey, {
        operatorId: row.operatorId || "",
        operator: row.operator || "Unknown",
        actual: 0,
        good: 0,
        reject: 0,
        target: 0,
        lossTime: 0,
        lossQty: 0,
        lossMinutes: 0,
        entries: 0,
        isNewOperator: Boolean(row.isNewOperator),
      });
    }

    const current = operatorMap.get(operatorKey);
    current.actual += Number(row.actual || 0);
    current.good += Number(row.good || 0);
    current.reject += Number(row.reject || 0);
    current.target += Number(row.target || 0);
    current.lossTime += Number(row.lossTime || 0);
    current.lossQty += Number(row.lossTime || 0);
    current.lossMinutes += Number(row.lossTimeMinutes || 0);
    current.entries += 1;
  });

  return Array.from(operatorMap.values()).sort((a, b) => b.actual - a.actual);
}

function buildFilterOptions(hourlyTable) {
  return {
    dates: uniqueSorted(hourlyTable.map((row) => row.date)),
    halls: uniqueSorted(hourlyTable.map((row) => row.hall)),
    shifts: uniqueSorted(hourlyTable.map((row) => normalizeShiftCode(row.shiftLabel || row.shift))).map((shift) => ({
      value: shift,
      label: getShiftLabel(shift),
    })),
    machines: uniqueSorted(hourlyTable.map((row) => row.machine)),
    operators: uniqueSorted(hourlyTable.map((row) => row.operator)).map((operator) => ({
      value: operator,
      label: operator,
    })),
    operatorIds: uniqueSorted(hourlyTable.map((row) => row.operatorId)),
    rejectReasons: uniqueSorted(
      hourlyTable.flatMap((row) => {
        if (Array.isArray(row.rejectBreakdown) && row.rejectBreakdown.length > 0) {
          return row.rejectBreakdown.map((item) => item.reason);
        }
        return row.rejectReason ? [row.rejectReason] : [];
      })
    ),
  };
}

function buildDerivedDashboardData(hourlyTable) {
  return {
    summary: updateSummary(hourlyTable),
    dayWiseTrend: buildDayWiseTrend(hourlyTable),
    shiftWiseProduction: buildShiftWiseProduction(hourlyTable),
    rejectionBreakdown: buildRejectionBreakdown(hourlyTable),
    lossBreakdown: buildLossBreakdown(hourlyTable),
    machineHourlyTrend: buildMachineHourlyTrend(hourlyTable),
    hallWiseProduction: buildHallWiseProduction(hourlyTable),
    operatorWiseProduction: buildOperatorWiseProduction(hourlyTable),
    filterOptions: buildFilterOptions(hourlyTable),
  };
}

function buildBaseDashboardState(hourlyTable = []) {
  return {
    ...initialDashboardData,
    hourlyTable,
    ...buildDerivedDashboardData(hourlyTable),
  };
}

function safeReadStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      const normalizedHourlyTable = Array.isArray(initialDashboardData.hourlyTable)
        ? initialDashboardData.hourlyTable.map(normalizeHourlyRow)
        : [];

      return buildBaseDashboardState(normalizedHourlyTable);
    }

    const parsed = JSON.parse(saved);

    const normalizedHourlyTable = Array.isArray(parsed?.hourlyTable)
      ? parsed.hourlyTable.map(normalizeHourlyRow)
      : Array.isArray(initialDashboardData.hourlyTable)
      ? initialDashboardData.hourlyTable.map(normalizeHourlyRow)
      : [];

    return {
      ...initialDashboardData,
      ...parsed,
      hourlyTable: normalizedHourlyTable,
      ...buildDerivedDashboardData(normalizedHourlyTable),
    };
  } catch {
    const normalizedHourlyTable = Array.isArray(initialDashboardData.hourlyTable)
      ? initialDashboardData.hourlyTable.map(normalizeHourlyRow)
      : [];

    return buildBaseDashboardState(normalizedHourlyTable);
  }
}

function createNormalizedEntryPayload(entry) {
  const actual = Number(entry.actual || 0);
  const reject = Number(entry.reject || 0);
  const target = Number(entry.target || 0);
  const good = Number(entry.good ?? Math.max(actual - reject, 0));
  const lossTime = Number(entry.lossTime ?? Math.max(target - actual, 0));
  const lossTimeMinutes = Number(entry.lossTimeMinutes || 0);

  const normalizedShiftCode = normalizeShiftCode(entry.shift || entry.shiftLabel);
  const normalizedShiftLabel = getShiftLabel(normalizedShiftCode);
  const normalizedBreakdown = normalizeRejectBreakdown(entry.rejectBreakdown || []);
  const normalizedLossTimeBreakdown = normalizeLossTimeBreakdown(entry.lossTimeBreakdown || []);
  const normalizedResponsibilities = normalizeResponsibilities(
    entry.responsibilities,
    normalizedLossTimeBreakdown
  );

  const generatedId = entry.id || entry.entryId || createEntryId();
  const machineDisplayName = entry.machineDisplayName || entry.machine || "";
  const nowIso = new Date().toISOString();

  return normalizeHourlyRow({
    id: generatedId,
    entryId: generatedId,
    date: entry.date,
    hall: entry.hall,
    machine: machineDisplayName,
    machineDisplayName,
    machineCode: entry.machineCode || "",
    machineName: entry.machineName || "",
    shift: normalizedShiftCode,
    shiftLabel: normalizedShiftLabel,
    hour: entry.duration || entry.hour,
    duration: entry.duration || entry.hour,
    part: entry.part,
    actual,
    good,
    reject,
    target,
    lossTime,
    lossTimeMinutes,
    operatorId: entry.operatorId || "",
    operator: entry.operator || "",
    isNewOperator: Boolean(entry.isNewOperator),
    rejectReason: normalizedBreakdown[0]?.reason || entry.rejectReason || "",
    rejectBreakdown: normalizedBreakdown,
    responsibilities: normalizedResponsibilities,
    lossTimeBreakdown: normalizedLossTimeBreakdown,
    remarks: entry.remarks || "",
    createdAt: entry.createdAt || nowIso,
    updatedAt: nowIso,
  });
}

export function ProductionProvider({ children }) {
  const [dashboardData, setDashboardData] = useState(() => safeReadStorage());
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboardData));
  }, [dashboardData]);

  const addProductionEntry = (entry) => {
    const newHourlyEntry = createNormalizedEntryPayload(entry);

    setDashboardData((prev) => {
      const updatedHourlyTable = [newHourlyEntry, ...prev.hourlyTable];
      const derived = buildDerivedDashboardData(updatedHourlyTable);

      return {
        ...prev,
        hourlyTable: updatedHourlyTable,
        ...derived,
      };
    });

    return newHourlyEntry;
  };

  const upsertProductionEntry = (entry) => {
    const normalizedEntry = createNormalizedEntryPayload(entry);

    setDashboardData((prev) => {
      const alreadyExists = prev.hourlyTable.some(
        (item) =>
          item.entryId === normalizedEntry.entryId || item.id === normalizedEntry.id
      );

      const updatedHourlyTable = alreadyExists
        ? prev.hourlyTable.map((item) =>
            item.entryId === normalizedEntry.entryId || item.id === normalizedEntry.id
              ? {
                  ...normalizedEntry,
                  createdAt: item.createdAt || normalizedEntry.createdAt,
                }
              : item
          )
        : [normalizedEntry, ...prev.hourlyTable];

      const derived = buildDerivedDashboardData(updatedHourlyTable);

      return {
        ...prev,
        hourlyTable: updatedHourlyTable,
        ...derived,
      };
    });

    return normalizedEntry;
  };

  const deleteProductionEntry = (entryId) => {
    if (!entryId) return false;

    let deleted = false;

    setDashboardData((prev) => {
      const updatedHourlyTable = prev.hourlyTable.filter(
        (item) => item.entryId !== entryId && item.id !== entryId
      );

      deleted = updatedHourlyTable.length !== prev.hourlyTable.length;

      if (!deleted) return prev;

      const derived = buildDerivedDashboardData(updatedHourlyTable);

      return {
        ...prev,
        hourlyTable: updatedHourlyTable,
        ...derived,
      };
    });

    return deleted;
  };

  const getProductionEntryById = (entryId) => {
    if (!entryId) return null;
    return (
      dashboardData.hourlyTable.find(
        (item) => item.entryId === entryId || item.id === entryId
      ) || null
    );
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const resetDashboardData = () => {
    localStorage.removeItem(STORAGE_KEY);

    const normalizedHourlyTable = Array.isArray(initialDashboardData.hourlyTable)
      ? initialDashboardData.hourlyTable.map(normalizeHourlyRow)
      : [];

    setDashboardData(buildBaseDashboardState(normalizedHourlyTable));
    setFilters(initialFilters);
  };

  const filteredDashboardData = useMemo(() => {
    const filteredHourlyTable = dashboardData.hourlyTable.filter((row) => {
      const dateMatch = !filters.date || row.date === filters.date;
      const hallMatch = !filters.hall || row.hall === filters.hall;

      const rowShiftCode = normalizeShiftCode(row.shiftLabel || row.shift);
      const filterShiftCode = normalizeShiftCode(filters.shift);
      const shiftMatch = !filters.shift || rowShiftCode === filterShiftCode;

      const machineMatch = !filters.machine || row.machine === filters.machine;

      const operatorMatch =
        !filters.operator ||
        (row.operator || "").toLowerCase().includes(filters.operator.toLowerCase());

      const operatorIdMatch =
        !filters.operatorId ||
        (row.operatorId || "").toLowerCase().includes(filters.operatorId.toLowerCase());

      const rejectReasonMatch =
        !filters.rejectReason ||
        (row.rejectBreakdownText || row.rejectReason || "")
          .toLowerCase()
          .includes(filters.rejectReason.toLowerCase());

      return (
        dateMatch &&
        hallMatch &&
        shiftMatch &&
        machineMatch &&
        operatorMatch &&
        operatorIdMatch &&
        rejectReasonMatch
      );
    });

    return {
      hourlyTable: filteredHourlyTable,
      ...buildDerivedDashboardData(filteredHourlyTable),
    };
  }, [dashboardData.hourlyTable, filters]);

  const value = useMemo(
    () => ({
      dashboardData,
      setDashboardData,
      addProductionEntry,
      upsertProductionEntry,
      deleteProductionEntry,
      getProductionEntryById,
      filters,
      setFilters,
      resetFilters,
      resetDashboardData,
      filteredDashboardData,
      filterOptions: filteredDashboardData.filterOptions,
      machineHourlyTrend: filteredDashboardData.machineHourlyTrend,
      hallWiseProduction: filteredDashboardData.hallWiseProduction,
      operatorWiseProduction: filteredDashboardData.operatorWiseProduction,
      rejectionBreakdown: filteredDashboardData.rejectionBreakdown,
      lossBreakdown: filteredDashboardData.lossBreakdown,
      dayWiseTrend: filteredDashboardData.dayWiseTrend,
      shiftWiseProduction: filteredDashboardData.shiftWiseProduction,
      currentShiftCode: getCurrentShiftCode(),
      setCurrentShiftFilter: () => {
        const today = new Date().toISOString().slice(0, 10);
        setFilters((prev) => ({
          ...prev,
          date: today,
          shift: getCurrentShiftCode(),
        }));
      },
    }),
    [dashboardData, filters, filteredDashboardData]
  );

  return <ProductionContext.Provider value={value}>{children}</ProductionContext.Provider>;
}

export function useProduction() {
  const context = useContext(ProductionContext);

  if (!context) {
    throw new Error("useProduction must be used inside ProductionProvider");
  }

  return context;
}