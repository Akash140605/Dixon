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

function parseHourLabel(hourLabel = "") {
  const firstPart = hourLabel.split("-")[0]?.trim() || "";
  return firstPart;
}

function normalizeShift(shiftValue = "") {
  if (!shiftValue) return "";
  if (
    shiftValue === "A" ||
    shiftValue === "Shift A" ||
    shiftValue === "Shift 1" ||
    shiftValue === "1"
  )
    return "Shift A";

  if (
    shiftValue === "B" ||
    shiftValue === "Shift B" ||
    shiftValue === "Shift 2" ||
    shiftValue === "2"
  )
    return "Shift B";

  if (
    shiftValue === "C" ||
    shiftValue === "Shift C" ||
    shiftValue === "Shift 3" ||
    shiftValue === "3"
  )
    return "Shift C";

  return shiftValue.startsWith("Shift ") ? shiftValue : `Shift ${shiftValue}`;
}

function formatDisplayDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
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

function buildRejectReasonText(rejectBreakdown = [], rejectReason = "") {
  if (Array.isArray(rejectBreakdown) && rejectBreakdown.length > 0) {
    return rejectBreakdown
      .map((item) => `${item.reason}: ${item.qty}`)
      .join(", ");
  }

  return rejectReason || "";
}

function normalizeHourlyRow(row = {}) {
  const normalizedBreakdown = normalizeRejectBreakdown(row.rejectBreakdown);

  return {
    ...row,
    id: row.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    operatorId: row.operatorId || "",
    operator: row.operator || "",
    shiftLabel: normalizeShift(row.shiftLabel || row.shift || ""),
    shift: normalizeShift(row.shift || row.shiftLabel || "").replace(
      "Shift ",
      "",
    ),
    hour: row.hour || row.duration || "",
    duration: row.duration || row.hour || "",
    actual: Number(row.actual || 0),
    good: Number(row.good || 0),
    reject: Number(row.reject || 0),
    target: Number(row.target || 0),
    rejectReason: row.rejectReason || "",
    rejectBreakdown: normalizedBreakdown,
    rejectBreakdownText: buildRejectReasonText(
      normalizedBreakdown,
      row.rejectReason || "",
    ),
    remarks: row.remarks || "",
    hall: row.hall || "",
    machine: row.machine || "",
    part: row.part || "",
    date: row.date || "",
  };
}

function updateSummary(hourlyTable) {
  const totalProduction = hourlyTable.reduce(
    (sum, row) => sum + Number(row.actual || 0),
    0,
  );
  const goodProduction = hourlyTable.reduce(
    (sum, row) => sum + Number(row.good || 0),
    0,
  );
  const rejection = hourlyTable.reduce(
    (sum, row) => sum + Number(row.reject || 0),
    0,
  );

  return {
    totalProduction,
    goodProduction,
    rejection,
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

    if (!dayWiseMap.has(shortDate)) {
      dayWiseMap.set(shortDate, {
        date: shortDate,
        production: 0,
        rejection: 0,
        target: 0,
      });
    }

    const current = dayWiseMap.get(shortDate);
    current.production += Number(row.actual || 0);
    current.rejection += Number(row.reject || 0);
    current.target += Number(row.target || 0);
  });

  return Array.from(dayWiseMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
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
      });
    }

    const current = shiftMap.get(shiftKey);
    current.actual += Number(row.actual || 0);
    current.rejection += Number(row.reject || 0);
    current.good += Number(row.good || 0);
    current.target += Number(row.target || 0);
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
          (rejectionMap.get(item.reason) || 0) + Number(item.qty || 0),
        );
      });
    } else if (Number(row.reject) > 0 && row.rejectReason) {
      rejectionMap.set(
        row.rejectReason,
        (rejectionMap.get(row.rejectReason) || 0) + Number(row.reject || 0),
      );
    }
  });

  return Array.from(rejectionMap.entries()).map(([reason, value]) => ({
    reason,
    value,
  }));
}

function buildMachineHourlyTrend(hourlyTable) {
  const grouped = {};

  hourlyTable.forEach((row) => {
    const machineKey = `${row.hall}__${row.machine}`;

    if (!grouped[machineKey]) {
      grouped[machineKey] = {
        machine: row.machine,
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
      shift: normalizeShift(row.shiftLabel || row.shift),
      operatorId: row.operatorId || "",
      operator: row.operator || "",
      part: row.part,
      rejectReason: row.rejectReason || "",
      rejectBreakdown: row.rejectBreakdown || [],
      rejectBreakdownText: row.rejectBreakdownText || "",
      remarks: row.remarks || "",
    });
  });

  return Object.values(grouped)
    .map((machineItem) => ({
      ...machineItem,
      data: machineItem.data.sort((a, b) =>
        a.sortHour.localeCompare(b.sortHour),
      ),
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
      });
    }

    const current = hallMap.get(row.hall);
    current.actual += Number(row.actual || 0);
    current.good += Number(row.good || 0);
    current.reject += Number(row.reject || 0);
    current.target += Number(row.target || 0);
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
        entries: 0,
      });
    }

    const current = operatorMap.get(operatorKey);
    current.actual += Number(row.actual || 0);
    current.good += Number(row.good || 0);
    current.reject += Number(row.reject || 0);
    current.target += Number(row.target || 0);
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

function safeReadStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      const normalizedHourlyTable = Array.isArray(
        initialDashboardData.hourlyTable,
      )
        ? initialDashboardData.hourlyTable.map(normalizeHourlyRow)
        : [];

      return {
        ...initialDashboardData,
        hourlyTable: normalizedHourlyTable,
        ...buildDerivedDashboardData(normalizedHourlyTable),
      };
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
    const normalizedHourlyTable = Array.isArray(
      initialDashboardData.hourlyTable,
    )
      ? initialDashboardData.hourlyTable.map(normalizeHourlyRow)
      : [];

    return {
      ...initialDashboardData,
      hourlyTable: normalizedHourlyTable,
      ...buildDerivedDashboardData(normalizedHourlyTable),
    };
  }
}

export function ProductionProvider({ children }) {
  const [dashboardData, setDashboardData] = useState(() => safeReadStorage());
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboardData));
  }, [dashboardData]);

  const addProductionEntry = (entry) => {
    setDashboardData((prev) => {
      const actual = Number(entry.actual || 0);
      const good = Number(entry.good || 0);
      const reject = Number(entry.reject || 0);
      const target = Number(entry.target || 0);

      const normalizedShift = normalizeShift(entry.shift);
      const compactShift = normalizedShift.replace("Shift ", "");
      const normalizedBreakdown = normalizeRejectBreakdown(
        entry.rejectBreakdown || [],
      );

      const newHourlyEntry = normalizeHourlyRow({
        id:
          entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: entry.date,
        hall: entry.hall,
        machine: entry.machine,
        shift: compactShift,
        shiftLabel: normalizedShift,
        hour: entry.duration,
        duration: entry.duration,
        part: entry.part,
        actual,
        good,
        reject,
        target,
        operatorId: entry.operatorId || "",
        operator: entry.operator || "",
        rejectReason:
          normalizedBreakdown[0]?.reason || entry.rejectReason || "",
        rejectBreakdown: normalizedBreakdown,
        remarks: entry.remarks || "",
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
    localStorage.removeItem(STORAGE_KEY);

    const normalizedHourlyTable = Array.isArray(
      initialDashboardData.hourlyTable,
    )
      ? initialDashboardData.hourlyTable.map(normalizeHourlyRow)
      : [];

    setDashboardData({
      ...initialDashboardData,
      hourlyTable: normalizedHourlyTable,
      ...buildDerivedDashboardData(normalizedHourlyTable),
    });

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
        (row.operator || "")
          .toLowerCase()
          .includes(filters.operator.toLowerCase());

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
    [dashboardData, filters, filteredDashboardData],
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
