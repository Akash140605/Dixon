import { Link, useNavigate, useParams } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { useProduction } from "../../../context/ProductionContext";
import MachineDetailGraphs from "./MachineDetailGraphs";
import {
  buildMachineRows,
  formatNumber,
  getHallLabelFromId,
  normalizeMachineName,
  readLocalProductionData,
  slugifyMachineName,
  toNumber,
} from "../../../data/machineDataHelpers";

function getArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function formatSafeDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function convertTo24Hour(timeStr) {
  const value = String(timeStr || "").trim().toUpperCase();
  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);

  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3];

  if (period === "AM" && hours === 12) hours = 0;
  if (period === "PM" && hours !== 12) hours += 12;

  return hours * 60 + minutes;
}

function getShiftByDuration(duration) {
  if (!duration) return "";

  const parts = String(duration).split("-");
  if (parts.length < 2) return "";

  const startMinutes = convertTo24Hour(parts[0].trim());
  if (startMinutes === null) return "";

  if (startMinutes >= 6 * 60 && startMinutes < 14 * 60) return "Shift A";
  if (startMinutes >= 14 * 60 && startMinutes < 22 * 60) return "Shift B";
  return "Shift C";
}

function normalizeShiftValue(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "a" || raw === "shift a") return "Shift A";
  if (raw === "b" || raw === "shift b") return "Shift B";
  if (raw === "c" || raw === "shift c") return "Shift C";
  return String(value || "").trim();
}

function getHallAliases(hallId, hallLabel) {
  const normalizedId = normalizeValue(hallId);
  const normalizedLabel = normalizeValue(hallLabel);

  if (normalizedId === "c8" || normalizedLabel === "c8") {
    return ["c8", "hall 5", "h5"];
  }

  if (normalizedId === "hall-1" || normalizedLabel === "hall 1") {
    return ["hall 1", "h1", "hall-1"];
  }

  if (normalizedId === "hall-2" || normalizedLabel === "hall 2") {
    return ["hall 2", "h2", "hall-2"];
  }

  if (normalizedId === "hall-3" || normalizedLabel === "hall 3") {
    return ["hall 3", "h3", "hall-3"];
  }

  if (normalizedId === "hall-4" || normalizedLabel === "hall 4") {
    return ["hall 4", "h4", "hall-4"];
  }

  return [normalizedLabel, normalizedId.replace(/-/g, " ")].filter(Boolean);
}

function getResolvedHallLabel(hallId, hallLabel) {
  const normalizedId = normalizeValue(hallId);
  const normalizedLabel = normalizeValue(hallLabel);

  if (normalizedId === "c8" || normalizedLabel === "c8") return "C8";
  if (normalizedId === "hall-1" || normalizedLabel === "hall 1") return "Hall 1";
  if (normalizedId === "hall-2" || normalizedLabel === "hall 2") return "Hall 2";
  if (normalizedId === "hall-3" || normalizedLabel === "hall 3") return "Hall 3";
  if (normalizedId === "hall-4" || normalizedLabel === "hall 4") return "Hall 4";

  return hallLabel || hallId || "";
}

function getEfficiencyConfig(value) {
  const efficiency = toNumber(value);

  if (efficiency >= 90) {
    return {
      badge: "border-emerald-300 bg-emerald-50 text-emerald-700",
      bar: "bg-emerald-600",
      dot: "bg-emerald-500",
      softPanel: "bg-emerald-50",
      status: "Optimal",
      statusText: "Running well",
    };
  }

  if (efficiency >= 75) {
    return {
      badge: "border-lime-300 bg-lime-50 text-lime-700",
      bar: "bg-lime-600",
      dot: "bg-lime-500",
      softPanel: "bg-lime-50",
      status: "Stable",
      statusText: "Stable operation",
    };
  }

  return {
    badge: "border-amber-300 bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
    softPanel: "bg-amber-50",
    status: "Attention",
    statusText: "Needs attention",
  };
}

function getLatestRow(rows = []) {
  return Array.isArray(rows) && rows.length ? rows[rows.length - 1] : null;
}

function getRowIdentity(row) {
  return (
    row?.entryId ||
    row?.id ||
    [
      row?.date || "",
      row?.shiftLabel || row?.shift || "",
      row?.hour || row?.duration || "",
      row?.operatorId || "",
      row?.machineCode || row?.machine || "",
      row?.part || "",
    ].join("__")
  );
}

function SelectField({ label, value, onChange, options, allLabel = "All" }) {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        className="h-10 w-full rounded-[4px] border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
      >
        <option value="all">{allLabel}</option>
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}

function KpiCard({ label, value, tone = "default", hint }) {
  const toneMap = {
    default: "border-slate-300 bg-white text-slate-950",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <div
      className={`min-w-0 rounded-[6px] border p-4 shadow-sm ${
        toneMap[tone] || toneMap.default
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p> : null}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-[6px] border border-slate-300 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p
        className="mt-2 break-words text-sm font-semibold leading-5 text-slate-900"
        title={value}
      >
        {value || "-"}
      </p>
    </div>
  );
}

function DetailStrip({ label, value, valueClassName = "text-slate-900" }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-[4px] border border-slate-300 bg-white px-3 py-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <span
        className={`break-words text-right text-sm font-bold tabular-nums ${valueClassName}`}
      >
        {value}
      </span>
    </div>
  );
}

function DetailTable({ rows, onEditRow, onDeleteRow, deletingRowId }) {
  if (!rows.length) {
    return (
      <div className="rounded-[6px] border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-900">No detailed rows found</p>
        <p className="mt-1 text-sm text-slate-500">
          Selected machine ke liye filtered rows available nahi hain.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[6px] border border-slate-300 bg-white shadow-sm">
      <div className="border-b border-slate-300 bg-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Detailed production rows</h3>
        <p className="mt-1 text-xs text-slate-500">
          Date, shift, operator, hour aur production metrics sab yahan visible hain.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-300">
              <th className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Date</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Shift</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Hour</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Operator</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Operator ID</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Part</th>
              
              <th className="whitespace-nowrap px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Target</th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Actual</th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Good</th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Reject</th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Loss Min</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Reject Reason</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Remarks</th>
              <th className="whitespace-nowrap px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const rowId = getRowIdentity(row);
              const isDeleting = deletingRowId === rowId;

              return (
                <tr
                  key={rowId}
                  className="border-b border-slate-200 last:border-b-0"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-slate-800">
                    {formatSafeDate(row.date)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-800">
                    {row.shiftLabel || row.shift || "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-800">
                    {row.hour || row.duration || "-"}
                  </td>
                  <td className="max-w-[180px] px-4 py-3 text-slate-800" title={row.operator || "-"}>
                    <div className="truncate">{row.operator || "-"}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-800">
                    {row.operatorId || "-"}
                  </td>
                  <td className="max-w-[180px] px-4 py-3 text-slate-800" title={row.part || "-"}>
                    <div className="truncate">{row.part || "-"}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-800">
                    {formatNumber(toNumber(row.target))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-sky-700">
                    {formatNumber(toNumber(row.actual))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-emerald-700">
                    {formatNumber(toNumber(row.good))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-rose-700">
                    {formatNumber(toNumber(row.reject))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-amber-700">
                    {formatNumber(
                      toNumber(row.lossMinutes ?? row.lossTimeMinutes ?? row.lossTime ?? 0)
                    )}
                  </td>
                  <td
                    className="max-w-[220px] px-4 py-3 text-slate-800"
                    title={row.rejectBreakdownText || row.rejectReason || "-"}
                  >
                    <div className="truncate">
                      {row.rejectBreakdownText || row.rejectReason || "-"}
                    </div>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-slate-800" title={row.remarks || "-"}>
                    <div className="truncate">{row.remarks || "-"}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* <button
                        type="button"
                        onClick={() => onEditRow(row)}
                        className="inline-flex h-8 items-center justify-center rounded-[4px] border border-sky-200 bg-sky-50 px-3 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                      >
                        Edit
                      </button> */}
                      <button
                        type="button"
                        onClick={() => onDeleteRow(row)}
                        disabled={isDeleting}
                        className="inline-flex h-8 items-center justify-center rounded-[4px] border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MachineDetailsView() {
  const { hallId, machineId } = useParams();
  const navigate = useNavigate();

  const {
    machineHourlyTrend,
    filteredDashboardData,
    deleteProductionEntry,
  } = useProduction();
  
  const localData = useMemo(() => readLocalProductionData(), []);

  const hallLabel = getHallLabelFromId(hallId);
  const hallAliases = useMemo(() => getHallAliases(hallId, hallLabel), [hallId, hallLabel]);
  const resolvedHallLabel = useMemo(
    () => getResolvedHallLabel(hallId, hallLabel),
    [hallId, hallLabel]
  );

  const mergedMachineTrend =
    getArray(machineHourlyTrend).length > 0
      ? getArray(machineHourlyTrend)
      : getArray(
          localData?.machineHourlyTrend ||
            localData?.filteredDashboardData?.machineHourlyTrend ||
            localData?.machineWiseHourlyTrend
        );

  const mergedHourlyTable =
    getArray(filteredDashboardData?.hourlyTable).length > 0
      ? getArray(filteredDashboardData?.hourlyTable)
      : getArray(
          localData?.hourlyTable ||
            localData?.filteredDashboardData?.hourlyTable ||
            localData?.hourlyProduction ||
            localData?.rows
        );

  const allRows = useMemo(
    () => buildMachineRows(mergedMachineTrend, mergedHourlyTable),
    [mergedMachineTrend, mergedHourlyTable]
  );

  const rawMachineRows = useMemo(() => {
    return allRows
      .filter((row) => {
        const rowHall = normalizeValue(row.hall);
        const sameHall = hallAliases.includes(rowHall);
        const sameMachine = slugifyMachineName(row.machine) === machineId;
        return sameHall && sameMachine;
      })
      .sort((a, b) => {
        const dateA = String(a.date || "");
        const dateB = String(b.date || "");
        if (dateA !== dateB) return dateA.localeCompare(dateB);

        const shiftA = String(a.shift || "");
        const shiftB = String(b.shift || "");
        if (shiftA !== shiftB) return shiftA.localeCompare(shiftB);

        return String(a.hour || "").localeCompare(String(b.hour || ""));
      });
  }, [allRows, hallAliases, machineId]);

  const filterOptions = useMemo(() => {
    return {
      dates: [...new Set(rawMachineRows.map((row) => row.date).filter(Boolean))].sort(),
      shifts: [...new Set(rawMachineRows.map((row) => row.shiftLabel || row.shift).filter(Boolean))].sort(),
      operators: [...new Set(rawMachineRows.map((row) => row.operator).filter(Boolean))].sort(),
      parts: [...new Set(rawMachineRows.map((row) => row.part).filter(Boolean))].sort(),
    };
  }, [rawMachineRows]);

  const [localFilters, setLocalFilters] = useState({
    date: "all",
    shift: "all",
    operator: "all",
    part: "all",
  });

  const [deletedRowIds, setDeletedRowIds] = useState([]);
  const [deletingRowId, setDeletingRowId] = useState("");

  useEffect(() => {
    setLocalFilters({
      date: "all",
      shift: "all",
      operator: "all",
      part: "all",
    });
    setDeletedRowIds([]);
    setDeletingRowId("");
  }, [hallId, machineId]);

  const visibleRawMachineRows = useMemo(() => {
    return rawMachineRows.filter((row) => !deletedRowIds.includes(getRowIdentity(row)));
  }, [rawMachineRows, deletedRowIds]);

  const machineRows = useMemo(() => {
    return visibleRawMachineRows.filter((row) => {
      const dateMatch = localFilters.date === "all" || row.date === localFilters.date;
      const shiftMatch =
        localFilters.shift === "all" ||
        (row.shiftLabel || row.shift) === localFilters.shift;
      const operatorMatch =
        localFilters.operator === "all" || row.operator === localFilters.operator;
      const partMatch = localFilters.part === "all" || row.part === localFilters.part;

      return dateMatch && shiftMatch && operatorMatch && partMatch;
    });
  }, [visibleRawMachineRows, localFilters]);

  const fallbackMachineBlock = useMemo(() => {
    return mergedMachineTrend.find((item) => {
      const itemName = normalizeMachineName(item);
      const sameMachine = slugifyMachineName(itemName) === machineId;
      const sameHall = hallAliases.includes(normalizeValue(item?.hall));
      return sameHall && sameMachine;
    });
  }, [mergedMachineTrend, hallAliases, machineId]);

  const machineProfile = useMemo(() => {
    const firstRow = machineRows[0];

    if (firstRow) {
      const actual = machineRows.reduce((sum, row) => sum + toNumber(row.actual), 0);
      const good = machineRows.reduce((sum, row) => sum + toNumber(row.good), 0);
      const reject = machineRows.reduce((sum, row) => sum + toNumber(row.reject), 0);
      const target = machineRows.reduce((sum, row) => sum + toNumber(row.target), 0);
      const lossMinutes = machineRows.reduce(
        (sum, row) => sum + toNumber(row.lossMinutes ?? row.lossTimeMinutes ?? row.lossTime ?? 0),
        0
      );

      const uniqueDates = [...new Set(machineRows.map((row) => row.date).filter(Boolean))];
      const uniqueShifts = [...new Set(machineRows.map((row) => row.shiftLabel || row.shift).filter(Boolean))];
      const uniqueOperators = [...new Set(machineRows.map((row) => row.operator).filter(Boolean))];
      const uniqueParts = [...new Set(machineRows.map((row) => row.part).filter(Boolean))];

      return {
        hall: firstRow.hall || resolvedHallLabel || "-",
        machine: firstRow.machine || "Unknown Machine",
        machineCode: firstRow.machineCode || firstRow.machine || "",
        machineName: firstRow.machineName || firstRow.machine || "",
        machineDisplayName:
          firstRow.machineDisplayName || firstRow.machineName || firstRow.machine || "",
        part: uniqueParts.join(", ") || "-",
        operator: uniqueOperators.join(", ") || "-",
        actual,
        good,
        reject,
        target,
        lossMinutes,
        efficiency: target > 0 ? (actual / target) * 100 : 0,
        points: machineRows.length,
        dates: uniqueDates,
        shifts: uniqueShifts,
        operators: uniqueOperators,
        parts: uniqueParts,
      };
    }

    if (!fallbackMachineBlock) return null;

    const actual = toNumber(fallbackMachineBlock.actual);
    const reject = toNumber(fallbackMachineBlock.reject);
    const target = toNumber(fallbackMachineBlock.target);
    const fallbackMachineName = normalizeMachineName(fallbackMachineBlock);

    return {
      hall: fallbackMachineBlock.hall || resolvedHallLabel || "-",
      machine: fallbackMachineName,
      machineCode:
        fallbackMachineBlock.machineCode ||
        fallbackMachineBlock.machine ||
        fallbackMachineName ||
        "",
      machineName:
        fallbackMachineBlock.machineName ||
        fallbackMachineBlock.machine ||
        fallbackMachineName ||
        "",
      machineDisplayName:
        fallbackMachineBlock.machineDisplayName ||
        fallbackMachineBlock.machineName ||
        fallbackMachineBlock.machine ||
        fallbackMachineName ||
        "",
      part: fallbackMachineBlock.part || fallbackMachineBlock.partName || "-",
      operator: fallbackMachineBlock.operator || "-",
      actual,
      good: toNumber(fallbackMachineBlock.good ?? actual - reject),
      reject,
      target,
      lossMinutes: toNumber(
        fallbackMachineBlock.lossMinutes ??
          fallbackMachineBlock.lossTimeMinutes ??
          fallbackMachineBlock.lossTime ??
          0
      ),
      efficiency: target > 0 ? (actual / target) * 100 : 0,
      points: Array.isArray(fallbackMachineBlock?.data)
        ? fallbackMachineBlock.data.length
        : 0,
      dates: [],
      shifts: [],
      operators: [],
      parts: [],
    };
  }, [machineRows, fallbackMachineBlock, resolvedHallLabel]);

  const graphMachineTrend = useMemo(() => {
    if (machineRows.length) {
      return [
        {
          hall: machineProfile?.hall || "",
          machine: machineProfile?.machine || "",
          part: machineProfile?.part || "",
          operator: machineProfile?.operator || "",
          data: machineRows,
        },
      ];
    }

    return fallbackMachineBlock ? [fallbackMachineBlock] : [];
  }, [machineRows, machineProfile, fallbackMachineBlock]);

  const latestRow = useMemo(
    () => getLatestRow(machineRows) || getLatestRow(visibleRawMachineRows),
    [machineRows, visibleRawMachineRows]
  );

  const prefillPayload = useMemo(() => {
    const filteredShift =
      localFilters.shift !== "all" ? localFilters.shift : latestRow?.shiftLabel || latestRow?.shift || "";

    const normalizedShift = normalizeShiftValue(filteredShift);

    const filteredDate =
      localFilters.date !== "all" ? localFilters.date : latestRow?.date || getTodayDate();

    const filteredOperator =
      localFilters.operator !== "all" ? localFilters.operator : latestRow?.operator || "";

    const filteredPart =
      localFilters.part !== "all" ? localFilters.part : latestRow?.part || "";

    const machineCode =
      latestRow?.machineCode ||
      machineProfile?.machineCode ||
      latestRow?.machine ||
      machineProfile?.machine ||
      "";

    const machineName =
      latestRow?.machineName ||
      machineProfile?.machineName ||
      machineProfile?.machine ||
      "";

    const machineDisplayName =
      latestRow?.machineDisplayName ||
      machineProfile?.machineDisplayName ||
      machineProfile?.machine ||
      "";

    const duration =
      latestRow?.duration ||
      latestRow?.hour ||
      (normalizedShift === "Shift A"
        ? "06:00 AM - 02:00 PM"
        : normalizedShift === "Shift B"
        ? "02:00 PM - 10:00 PM"
        : normalizedShift === "Shift C"
        ? "10:00 PM - 06:00 AM"
        : "");

    return {
      prefillFromMachineDetails: true,
      source: "machine-details",
      hall: resolvedHallLabel,
      hallLabel: resolvedHallLabel,
      machineCode,
      machineName,
      machineDisplayName,
      machine: machineCode,
      date: filteredDate || getTodayDate(),
      shift: normalizedShift || getShiftByDuration(duration),
      duration,
      operatorId: latestRow?.operatorId || "",
      operator: filteredOperator,
      part: filteredPart,
    };
  }, [localFilters, latestRow, machineProfile, resolvedHallLabel]);

  const handleAddEntry = () => {
    navigate("/entry", {
      state: prefillPayload,
    });
  };

  const handleEditRow = (row) => {
    const rowShift = normalizeShiftValue(row?.shiftLabel || row?.shift || "");
    const rowDuration =
      row?.duration ||
      row?.hour ||
      (rowShift === "Shift A"
        ? "06:00 AM - 02:00 PM"
        : rowShift === "Shift B"
        ? "02:00 PM - 10:00 PM"
        : rowShift === "Shift C"
        ? "10:00 PM - 06:00 AM"
        : "");

    navigate("/entry", {
      state: {
        prefillFromMachineDetails: true,
        source: "machine-details-edit",
        isEditMode: true,
        id: row?.id, // CRITICAL FIX: ID for Edit PUT Request 
        rowId: row?.entryId || getRowIdentity(row),
        entryId: row?.entryId || row?.id || getRowIdentity(row),
        originalRow: row,
        hall: resolvedHallLabel,
        hallLabel: resolvedHallLabel,
        machineCode:
          row?.machineCode || machineProfile?.machineCode || row?.machine || "",
        machineName:
          row?.machineName || machineProfile?.machineName || row?.machine || "",
        machineDisplayName:
          row?.machineDisplayName ||
          machineProfile?.machineDisplayName ||
          row?.machine ||
          "",
        machine: row?.machineCode || row?.machine || "",
        date: row?.date || getTodayDate(),
        shift: rowShift || getShiftByDuration(rowDuration),
        duration: rowDuration,
        operatorId: row?.operatorId || "",
        operator: row?.operator || "",
        part: row?.part || "",
        target: toNumber(row?.target),
        actual: toNumber(row?.actual),
        good: toNumber(row?.good),
        reject: toNumber(row?.reject),
        
        // CRITICAL FIX: Ensure loss mapping matches the form precisely
        lossTime: toNumber(row?.lossTime ?? row?.lossQty ?? 0),
        lossMinutes: toNumber(
          row?.lossMinutes ?? row?.lossTimeMinutes ?? row?.lossTime ?? 0
        ),
        lossTimeMinutes: toNumber(
          row?.lossMinutes ?? row?.lossTimeMinutes ?? row?.lossTime ?? 0
        ),
        
        rejectReason: row?.rejectReason || row?.rejectBreakdownText || "",
        
        // CRITICAL FIX: Safe mapping for breakdown arrays 
        rejectBreakdown: Array.isArray(row?.rejectBreakdown) ? row.rejectBreakdown : [],
        lossTimeBreakdown: Array.isArray(row?.lossTimeBreakdown) && row.lossTimeBreakdown.length > 0
          ? row.lossTimeBreakdown 
          : Array.isArray(row?.responsibilities) ? row.responsibilities : [],
        
        remarks: row?.remarks || "",
      },
    });
  };

  const handleDeleteRow = async (row) => {
    const confirmed = window.confirm(
      `Delete Entry?\n\n${row.machine || ""} | ${row.date || ""}`
    );

    if (!confirmed) return;

    try {
      setDeletingRowId(getRowIdentity(row));

      if (deleteProductionEntry) {
        await deleteProductionEntry(row.id);
      } else {
        throw new Error("deleteProductionEntry context missing");
      }

      alert("Entry deleted successfully");

    } catch (error) {
      console.error(error);
      alert(error?.message || "Failed to delete entry");
    } finally {
      setDeletingRowId("");
    }
  };

  if (!machineProfile) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-4 md:px-6 2xl:px-8">
        <div className="mx-auto max-w-[1600px] rounded-[8px] border border-slate-300 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Machine details not found
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Selected machine ka data available nahi mila.
              </p>
            </div>

            <Link
              to={`/hall/${hallId}`}
              className="inline-flex h-10 items-center justify-center rounded-[4px] border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back to Machines
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const efficiencyConfig = getEfficiencyConfig(machineProfile.efficiency);
  const progressWidth = Math.max(0, Math.min(100, machineProfile.efficiency));
  const rejectRate =
    machineProfile.actual > 0
      ? (machineProfile.reject / machineProfile.actual) * 100
      : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <main className="mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-5 2xl:px-8">
        <section className="overflow-hidden rounded-[8px] border border-slate-300 bg-white shadow-sm">
          <div className="border-b border-slate-300 bg-[#534DA0] px-4 py-4 text-white md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <Link to="/" className="hover:text-white">
                    Hals
                  </Link>
                  <span>/</span>
                  <Link to={`/hall/${hallId}`} className="hover:text-white">
                    {machineProfile.hall}
                  </Link>
                  <span>/</span>
                  <span className="truncate text-white">{machineProfile.machine}</span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-[4px] border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${efficiencyConfig.badge}`}
                  >
                    {efficiencyConfig.status}
                  </span>
                  <span className="inline-flex rounded-[4px] border border-slate-600 bg-[#534DA0] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-200">
                    {machineProfile.points} data points
                  </span>
                </div>

                <h1
                  className="mt-3 text-xl font-semibold tracking-tight md:text-3xl"
                  title={machineProfile.machine}
                >
                  {machineProfile.machine} Details
                </h1>

                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  Selected machine ki summary, hourly production trend, rejection aur
                  loss analysis.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleAddEntry}
                  className="inline-flex h-10 items-center justify-center rounded-[4px] border border-sky-600 bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700"
                >
                  Add Entry
                </button>

                <Link
                  to={`/hall/${hallId}`}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-[4px] border border-slate-600 bg-[#534DA0] px-4 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  Back to Machines
                </Link>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-300 bg-slate-50 px-4 py-4 md:px-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SelectField
                label="Date"
                value={localFilters.date}
                onChange={(e) =>
                  setLocalFilters((prev) => ({ ...prev, date: e.target.value }))
                }
                options={filterOptions.dates}
                allLabel="All Dates"
              />
              <SelectField
                label="Shift"
                value={localFilters.shift}
                onChange={(e) =>
                  setLocalFilters((prev) => ({ ...prev, shift: e.target.value }))
                }
                options={filterOptions.shifts}
                allLabel="All Shifts"
              />
              <SelectField
                label="Operator"
                value={localFilters.operator}
                onChange={(e) =>
                  setLocalFilters((prev) => ({ ...prev, operator: e.target.value }))
                }
                options={filterOptions.operators}
                allLabel="All Operators"
              />
              <SelectField
                label="Part"
                value={localFilters.part}
                onChange={(e) =>
                  setLocalFilters((prev) => ({ ...prev, part: e.target.value }))
                }
                options={filterOptions.parts}
                allLabel="All Parts"
              />
            </div>
          </div>

          <div className="p-4 md:p-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <div className="rounded-[6px] border border-slate-300 bg-slate-50 p-4 shadow-sm">
                <div className="rounded-[6px] border border-slate-800 bg-[#534DA0] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 ${efficiencyConfig.dot}`} />
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Machine Profile
                        </p>
                      </div>

                      <h2
                        className="mt-2 break-words text-xl font-bold tracking-tight text-white md:text-2xl"
                        title={machineProfile.machine}
                      >
                        {machineProfile.machine}
                      </h2>

                      <p className="mt-2 text-sm text-slate-300">
                        Hall: {machineProfile.hall}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-[4px] border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${efficiencyConfig.badge}`}
                    >
                      {efficiencyConfig.status}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Efficiency
                      </p>
                      <p className="mt-1 text-[30px] font-bold leading-none tabular-nums text-white">
                        {machineProfile.efficiency.toFixed(1)}%
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Reject Rate
                      </p>
                      <p className="mt-1 text-lg font-bold tabular-nums text-rose-300">
                        {rejectRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden bg-[#534DA0]">
                    <div
                      className={`h-full ${efficiencyConfig.bar}`}
                      style={{ width: `${progressWidth}%` }}
                    />
                  </div>
                </div>

                <div
                  className={`mt-4 rounded-[6px] border border-slate-300 p-4 ${efficiencyConfig.softPanel}`}
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <InfoCard label="Hall" value={machineProfile.hall} />
                    <InfoCard label="Part" value={machineProfile.part} />
                    <InfoCard label="Operator" value={machineProfile.operator} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-3">
                  <DetailStrip label="Target" value={formatNumber(machineProfile.target)} />
                  <DetailStrip
                    label="Actual"
                    value={formatNumber(machineProfile.actual)}
                    valueClassName="text-sky-700"
                  />
                  <DetailStrip
                    label="Good"
                    value={formatNumber(machineProfile.good)}
                    valueClassName="text-emerald-700"
                  />
                  <DetailStrip
                    label="Reject"
                    value={formatNumber(machineProfile.reject)}
                    valueClassName="text-rose-700"
                  />
                  <DetailStrip
                    label="Loss Min"
                    value={formatNumber(machineProfile.lossMinutes)}
                    valueClassName="text-amber-700"
                  />
                  <DetailStrip
                    label="Status"
                    value={efficiencyConfig.statusText}
                    valueClassName="text-slate-800"
                  />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <InfoCard
                    label="Dates in View"
                    value={
                      machineProfile.dates.length
                        ? machineProfile.dates.map(formatSafeDate).join(", ")
                        : "-"
                    }
                  />
                  <InfoCard
                    label="Shifts in View"
                    value={machineProfile.shifts.length ? machineProfile.shifts.join(", ") : "-"}
                  />
                  <InfoCard
                    label="Operators in View"
                    value={
                      machineProfile.operators.length
                        ? machineProfile.operators.join(", ")
                        : "-"
                    }
                  />
                  <InfoCard
                    label="Parts in View"
                    value={machineProfile.parts.length ? machineProfile.parts.join(", ") : "-"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <KpiCard
                  label="Target"
                  value={formatNumber(machineProfile.target)}
                  hint="Planned production"
                />
                <KpiCard
                  label="Actual"
                  value={formatNumber(machineProfile.actual)}
                  tone="sky"
                  hint="Produced quantity"
                />
                <KpiCard
                  label="Good"
                  value={formatNumber(machineProfile.good)}
                  tone="emerald"
                  hint="Accepted quantity"
                />
                <KpiCard
                  label="Reject"
                  value={formatNumber(machineProfile.reject)}
                  tone="rose"
                  hint="Rejected quantity"
                />
                <KpiCard
                  label="Loss Minutes"
                  value={formatNumber(machineProfile.lossMinutes)}
                  tone="amber"
                  hint="Total downtime"
                />
                <KpiCard
                  label="Efficiency"
                  value={`${machineProfile.efficiency.toFixed(1)}%`}
                  tone="sky"
                  hint="Actual vs target"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6">
          <MachineDetailGraphs
            machineHourlyTrend={graphMachineTrend}
            hourlyTable={machineRows}
          />
        </div>

        <div className="mt-6">
          <DetailTable
            rows={machineRows}
            onEditRow={handleEditRow}
            onDeleteRow={handleDeleteRow}
            deletingRowId={deletingRowId}
          />
        </div>
      </main>
    </div>
  );
}