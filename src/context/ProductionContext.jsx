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

function parseHourLabel(hourLabel = "") {
  return hourLabel.split("-")[0]?.trim() || "";
}

function normalizeShift(shiftValue = "") {
  if (!shiftValue) return "";

  if (["A", "Shift A", "Shift 1", "1"].includes(shiftValue)) return "Shift A";
  if (["B", "Shift B", "Shift 2", "2"].includes(shiftValue)) return "Shift B";
  if (["C", "Shift C", "Shift 3", "3"].includes(shiftValue)) return "Shift C";

  return shiftValue.startsWith("Shift ") ? shiftValue : `Shift ${shiftValue}`;
}

function formatDisplayDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function normalizeRejectBreakdown(breakdown = []) {
  if (!Array.isArray(breakdown)) return [];

  return breakdown
    .map((item) => ({
      reason: item?.reason || "",
      qty: Number(item?.qty || 0),
    }))
    .filter((item) => item.reason && item.qty > 0);
}

function normalizeResponsibilities(responsibilities = []) {
  if (!Array.isArray(responsibilities)) return [];

  return responsibilities
    .map((item) => ({
      person: item?.person || item?.name || "",
      department: item?.department || "",
      reason: item?.reason || "",
      qty: Number(item?.qty || 0),
    }))
    .filter((item) => item.person || item.reason || item.qty > 0);
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
    .map((item) => {
      const personText = item.department
        ? `${item.person} (${item.department})`
        : item.person;

      return item.reason
        ? `${item.reason}: ${item.qty}${personText ? ` - ${personText}` : ""}`
        : personText;
    })
    .filter(Boolean)
    .join(", ");
}

function getMachineDisplay(row = {}) {
  if (typeof row.machine === "string" && row.machine.trim()) return row.machine;
  if (row.machine?.displayName) return row.machine.displayName;
  if (row.machineCode && row.machineName) return `${row.machineCode} - ${row.machineName}`;
  if (row.machineCode) return row.machineCode;
  return "";
}

function normalizeHourlyRow(row = {}) {
  const normalizedBreakdown = normalizeRejectBreakdown(row.rejectBreakdown);
  const normalizedResponsibilities = normalizeResponsibilities(
    row.lossTimeBreakdown || row.responsibilities || []
  );

  const actual = Number(row.actual || 0);
  const reject = Number(row.reject || 0);
  const target = Number(row.target || 0);
  const good =
    row.good !== undefined && row.good !== null
      ? Number(row.good || 0)
      : Math.max(actual - reject, 0);

  return {
    ...row,
    id: row.id || createEntryId(),
    operatorId: row.operatorId || "",
    operator: row.operator || "",
    isNewOperator: Boolean(row.isNewOperator),
    shiftLabel: normalizeShift(row.shiftLabel || row.shift || ""),
    shift: normalizeShift(row.shift || row.shiftLabel || "").replace("Shift ", ""),
    hour: row.hour || row.duration || "",
    duration: row.duration || row.hour || "",
    actual,
    good,
    reject,
    target,
    lossTime: Number(row.lossTime || Math.max(target - actual, 0)),
    rejectReason: row.rejectReason || normalizedBreakdown[0]?.reason || "",
    rejectBreakdown: normalizedBreakdown,
    rejectBreakdownText: buildRejectReasonText(
      normalizedBreakdown,
      row.rejectReason || ""
    ),
    responsibilities: normalizedResponsibilities,
    responsibilitiesText: buildResponsibilitiesText(normalizedResponsibilities),
    remarks: row.remarks || "",
    hall: row.hall || "",
    machine: getMachineDisplay(row),
    machineCode: row.machineCode || row.machine?.code || "",
    machineName: row.machineName || row.machine?.name || "",
    part: row.part || "",
    date: row.date || "",
    createdAt: row.createdAt || "",
  };
}

function updateSummary(hourlyTable) {
  const totalProduction = hourlyTable.reduce(
    (sum, row) => sum + Number(row.actual || 0),
    0
  );

  const goodProduction = hourlyTable.reduce(
    (sum, row) => sum + Number(row.good || 0),
    0
  );

  const rejection = hourlyTable.reduce(
    (sum, row) => sum + Number(row.reject || 0),
    0
  );

  const targetProduction = hourlyTable.reduce(
    (sum, row) => sum + Number(row.target || 0),
    0
  );

  const lossTime = hourlyTable.reduce(
    (sum, row) => sum + Number(row.lossTime || 0),
    0
  );

  return {
    totalProduction,
    goodProduction,
    rejection,
    targetProduction,
    lossTime,
    rejectionPercent:
      totalProduction > 0
        ? ((rejection / totalProduction) * 100).toFixed(2) + "%"
        : "0.00%",
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
        production: 0,
        rejection: 0,
        target: 0,
        good: 0,
        lossTime: 0,
      });
    }

    const current = dayWiseMap.get(shortDate);
    current.production += Number(row.actual || 0);
    current.rejection += Number(row.reject || 0);
    current.target += Number(row.target || 0);
    current.good += Number(row.good || 0);
    current.lossTime += Number(row.lossTime || 0);
  });

  return Array.from(dayWiseMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

function buildShiftWiseProduction(hourlyTable) {
  const shiftMap = new Map();

  hourlyTable.forEach((row) => {
    const shiftKey = normalizeShift(row.shiftLabel || row.shift);

    if (!shiftMap.has(shiftKey)) {
      shiftMap.set(shiftKey, {
        shift: shiftKey,
        actual: 0,
        rejection: 0,
        good: 0,
        target: 0,
        lossTime: 0,
      });
    }

    const current = shiftMap.get(shiftKey);
    current.actual += Number(row.actual || 0);
    current.rejection += Number(row.reject || 0);
    current.good += Number(row.good || 0);
    current.target += Number(row.target || 0);
    current.lossTime += Number(row.lossTime || 0);
  });

  return Array.from(shiftMap.values());
}

function buildRejectionBreakdown(hourlyTable) {
  const rejectionMap = new Map();

  hourlyTable.forEach((row) => {
    if (Array.isArray(row.rejectBreakdown) && row.rejectBreakdown.length > 0) {
      row.rejectBreakdown.forEach((item) => {
        rejectionMap.set(
          item.reason,
          (rejectionMap.get(item.reason) || 0) + Number(item.qty || 0)
        );
      });
    } else if (Number(row.reject) > 0 && row.rejectReason) {
      rejectionMap.set(
        row.rejectReason,
        (rejectionMap.get(row.rejectReason) || 0) + Number(row.reject || 0)
      );
    }
  });

  return Array.from(rejectionMap.entries())
    .map(([reason, value]) => ({ reason, value }))
    .sort((a, b) => b.value - a.value);
}

function buildMachineHourlyTrend(hourlyTable) {
  const grouped = {};

  hourlyTable.forEach((row) => {
    const machineKey = `${row.hall}__${row.machine}`;

    if (!grouped[machineKey]) {
      grouped[machineKey] = {
        machine: row.machine,
        machineCode: row.machineCode || "",
        machineName: row.machineName || "",
        hall: row.hall,
        shift: normalizeShift(row.shiftLabel || row.shift),
        operatorId: row.operatorId || "",
        operator: row.operator || "",
        part: row.part,
        data: [],
      };
    }

    grouped[machineKey].data.push({
      hour: row.hour || row.duration,
      sortHour: parseHourLabel(row.hour || row.duration),
      actual: Number(row.actual || 0),
      good: Number(row.good || 0),
      reject: Number(row.reject || 0),
      target: Number(row.target || 0),
      lossTime: Number(row.lossTime || 0),
      shift: normalizeShift(row.shiftLabel || row.shift),
      operatorId: row.operatorId || "",
      operator: row.operator || "",
      part: row.part,
      rejectReason: row.rejectReason || "",
      rejectBreakdown: row.rejectBreakdown || [],
      rejectBreakdownText: row.rejectBreakdownText || "",
      responsibilities: row.responsibilities || [],
      responsibilitiesText: row.responsibilitiesText || "",
      remarks: row.remarks || "",
      isNewOperator: Boolean(row.isNewOperator),
      date: row.date || "",
    });
  });

  return Object.values(grouped)
    .map((machineItem) => ({
      ...machineItem,
      data: machineItem.data.sort((a, b) => a.sortHour.localeCompare(b.sortHour)),
    }))
    .sort((a, b) => {
      if (a.hall !== b.hall) return a.hall.localeCompare(b.hall);
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
      });
    }

    const current = hallMap.get(row.hall);
    current.actual += Number(row.actual || 0);
    current.good += Number(row.good || 0);
    current.reject += Number(row.reject || 0);
    current.target += Number(row.target || 0);
    current.lossTime += Number(row.lossTime || 0);
  });

  return Array.from(hallMap.values()).sort((a, b) => b.actual - a.actual);
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
    current.entries += 1;
  });

  return Array.from(operatorMap.values()).sort((a, b) => b.actual - a.actual);
}

function buildDerivedDashboardData(hourlyTable) {
  return {
    summary: updateSummary(hourlyTable),
    dayWiseTrend: buildDayWiseTrend(hourlyTable),
    shiftWiseProduction: buildShiftWiseProduction(hourlyTable),
    rejectionBreakdown: buildRejectionBreakdown(hourlyTable),
    machineHourlyTrend: buildMachineHourlyTrend(hourlyTable),
    hallWiseProduction: buildHallWiseProduction(hourlyTable),
    operatorWiseProduction: buildOperatorWiseProduction(hourlyTable),
  };
}

function buildBaseDashboardState(hourlyTable = []) {
  return {
    ...initialDashboardData,
    hourlyTable,
    ...buildDerivedDashboardData(hourlyTable),
  };
}

function getInitialNormalizedRows() {
  return Array.isArray(initialDashboardData.hourlyTable)
    ? initialDashboardData.hourlyTable.map(normalizeHourlyRow)
    : [];
}

function safeReadStorage() {
  if (typeof window === "undefined") {
    return buildBaseDashboardState(getInitialNormalizedRows());
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return buildBaseDashboardState(getInitialNormalizedRows());
    }

    const parsed = JSON.parse(saved);

    const normalizedHourlyTable = Array.isArray(parsed?.hourlyTable)
      ? parsed.hourlyTable.map(normalizeHourlyRow)
      : getInitialNormalizedRows();

    return {
      ...initialDashboardData,
      ...parsed,
      hourlyTable: normalizedHourlyTable,
      ...buildDerivedDashboardData(normalizedHourlyTable),
    };
  } catch {
    return buildBaseDashboardState(getInitialNormalizedRows());
  }
}

export function ProductionProvider({ children }) {
  const [dashboardData, setDashboardData] = useState(() => safeReadStorage());
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboardData));
  }, [dashboardData]);

  const addProductionEntry = (entry) => {
    setDashboardData((prev) => {
      const actual = Number(entry.actual || 0);
      const reject = Number(entry.reject || 0);
      const target = Number(entry.target || 0);
      const good =
        entry.good !== undefined && entry.good !== null
          ? Number(entry.good || 0)
          : Math.max(actual - reject, 0);
      const lossTime = Number(entry.lossTime || Math.max(target - actual, 0));

      const normalizedShift = normalizeShift(entry.shift || entry.shiftLabel);
      const compactShift = normalizedShift.replace("Shift ", "");
      const normalizedBreakdown = normalizeRejectBreakdown(entry.rejectBreakdown || []);
      const normalizedResponsibilities = normalizeResponsibilities(
        entry.lossTimeBreakdown || entry.responsibilities || []
      );

      const newHourlyEntry = normalizeHourlyRow({
        id: entry.id || createEntryId(),
        date: entry.date,
        hall: entry.hall,
        machine: entry.machine,
        machineCode: entry.machineCode || "",
        machineName: entry.machineName || "",
        shift: compactShift,
        shiftLabel: normalizedShift,
        hour: entry.hour || entry.duration,
        duration: entry.duration || entry.hour,
        part: entry.part,
        actual,
        good,
        reject,
        target,
        lossTime,
        operatorId: entry.operatorId || "",
        operator: entry.operator || "",
        isNewOperator: Boolean(entry.isNewOperator),
        rejectReason: normalizedBreakdown[0]?.reason || entry.rejectReason || "",
        rejectBreakdown: normalizedBreakdown,
        lossTimeBreakdown: normalizedResponsibilities,
        remarks: entry.remarks || "",
        createdAt: entry.createdAt || new Date().toISOString(),
      });

      const updatedHourlyTable = [newHourlyEntry, ...prev.hourlyTable];
      const derived = buildDerivedDashboardData(updatedHourlyTable);

      return {
        ...prev,
        hourlyTable: updatedHourlyTable,
        ...derived,
      };
    });
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const resetDashboardData = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }

    setDashboardData(buildBaseDashboardState(getInitialNormalizedRows()));
    setFilters(initialFilters);
  };

  const filteredDashboardData = useMemo(() => {
    const filteredHourlyTable = dashboardData.hourlyTable.filter((row) => {
      const dateMatch = !filters.date || row.date === filters.date;
      const hallMatch = !filters.hall || row.hall === filters.hall;

      const rowShiftLabel = normalizeShift(row.shiftLabel || row.shift);
      const filterShiftLabel = normalizeShift(filters.shift);
      const shiftMatch = !filters.shift || rowShiftLabel === filterShiftLabel;

      const machineMatch = !filters.machine || row.machine === filters.machine;

      const operatorMatch =
        !filters.operator ||
        (row.operator || "").toLowerCase().includes(filters.operator.toLowerCase());

      const operatorIdMatch =
        !filters.operatorId ||
        (row.operatorId || "")
          .toLowerCase()
          .includes(filters.operatorId.toLowerCase());

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
      filters,
      setFilters,
      resetFilters,
      resetDashboardData,
      filteredDashboardData,
      machineHourlyTrend: filteredDashboardData.machineHourlyTrend,
      hallWiseProduction: filteredDashboardData.hallWiseProduction,
      operatorWiseProduction: filteredDashboardData.operatorWiseProduction,
      rejectionBreakdown: filteredDashboardData.rejectionBreakdown,
    }),
    [dashboardData, filters, filteredDashboardData]
  );

  return (
    <ProductionContext.Provider value={value}>
      {children}
    </ProductionContext.Provider>
  );
}

export function useProduction() {
  const context = useContext(ProductionContext);

  if (!context) {
    throw new Error("useProduction must be used inside ProductionProvider");
  }

  return context;
}