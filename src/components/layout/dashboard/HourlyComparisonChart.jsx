import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Legend,
} from "recharts";

const INDUSTRY_COLORS = {
  production: "#2563EB",
  good: "#16A34A",
  reject: "#DC2626",
  rejectSoft: "#FCA5A5",
  loss: "#D97706",
  lossSoft: "#FDBA74",
  target: "#64748B",
  efficiency: "#0EA5E9",
  grid: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#475569",
  bgSoft: "#F8FAFC",
  border: "#E2E8F0",
};

const FIXED_BAR_SIZE = 18;
const COMPACT_BAR_SIZE = 14;

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value) {
  return toNumber(value).toLocaleString("en-IN");
}

function formatPercent(value) {
  return `${toNumber(value).toFixed(1)}%`;
}

function normalizeMachineName(item = {}) {
  return (
    item.machine ||
    item.machineName ||
    item.machineDisplayName ||
    item.machineCode ||
    "Unknown Machine"
  );
}

function normalizePartName(item = {}) {
  return item.part || item.partName || item.item || "Unknown Part";
}

function truncateLabel(value, limit = 18) {
  const text = String(value || "");
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function EmptyState({ text }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
      {text}
    </div>
  );
}

function SummaryCard({ label, value, tone = "default", helper }) {
  const toneClass =
    tone === "good"
      ? "text-emerald-700"
      : tone === "reject"
        ? "text-rose-700"
        : tone === "loss"
          ? "text-orange-700"
          : tone === "efficiency"
            ? "text-sky-700"
            : "text-slate-900";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-sm font-semibold tabular-nums ${toneClass}`}>
        {value}
      </p>
      {helper ? (
        <p className="mt-1 text-[11px] text-slate-500">{helper}</p>
      ) : null}
    </div>
  );
}

function SelectField({ label, value, onChange, options, allLabel }) {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
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

function ChartFilterRow({
  title,
  subtitle,
  hall,
  machine,
  part,
  hallOptions,
  machineOptions,
  partOptions,
  onHallChange,
  onMachineChange,
  onPartChange,
  rightText,
}) {
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        {rightText ? (
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            {rightText}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <SelectField
          label="Hall"
          value={hall}
          onChange={onHallChange}
          options={hallOptions}
          allLabel="All Halls"
        />
        <SelectField
          label="Machine"
          value={machine}
          onChange={onMachineChange}
          options={machineOptions}
          allLabel="All Machines"
        />
        <SelectField
          label="Part"
          value={part}
          onChange={onPartChange}
          options={partOptions}
          allLabel="All Parts"
        />
      </div>
    </div>
  );
}

function EfficiencyTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload || {};

  return (
    <div className="min-w-[220px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-slate-900">{label}</p>
      <div className="space-y-1 text-xs text-slate-700">
        <div className="flex items-center justify-between">
          <span>Hall</span>
          <span className="font-semibold">{row.hall || "-"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Machine</span>
          <span className="font-semibold">{row.machine || "-"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Part</span>
          <span className="font-semibold">{row.part || "-"}</span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-2">
          <span>Actual</span>
          <span className="font-semibold tabular-nums">
            {formatNumber(row.actual)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Target</span>
          <span className="font-semibold tabular-nums">
            {formatNumber(row.target)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Efficiency</span>
          <span className="font-semibold tabular-nums">
            {toNumber(row.efficiency).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function RejectionTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload || {};
  const reasonEntries = Object.entries(row.rejectionReasons || {}).sort(
    (a, b) => toNumber(b[1]) - toNumber(a[1]),
  );

  return (
    <div className="min-w-[250px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-slate-900">{label}</p>

      <div className="space-y-1 text-xs text-slate-700">
        <div className="flex items-center justify-between">
          <span>Total Reject</span>
          <span className="font-semibold tabular-nums">
            {formatNumber(row.reject)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Reject %</span>
          <span className="font-semibold tabular-nums">
            {toNumber(row.rejectRate).toFixed(1)}%
          </span>
        </div>
      </div>

      {reasonEntries.length ? (
        <div className="mt-3 space-y-1 border-t border-slate-200 pt-2">
          {reasonEntries.map(([reason, value]) => (
            <div
              key={reason}
              className="flex items-center justify-between gap-3 text-xs text-slate-700"
            >
              <span className="truncate">{reason}</span>
              <span className="font-semibold tabular-nums">
                {formatNumber(value)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LossTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload || {};
  const reasonEntries = Object.entries(row.lossReasons || {}).sort(
    (a, b) => toNumber(b[1]) - toNumber(a[1]),
  );

  return (
    <div className="min-w-[250px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-slate-900">{label}</p>

      <div className="space-y-1 text-xs text-slate-700">
        <div className="flex items-center justify-between">
          <span>Total Loss Min</span>
          <span className="font-semibold tabular-nums">
            {formatNumber(row.lossMinutes)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Loss Qty</span>
          <span className="font-semibold tabular-nums">
            {formatNumber(row.lossQty)}
          </span>
        </div>
      </div>

      {reasonEntries.length ? (
        <div className="mt-3 space-y-1 border-t border-slate-200 pt-2">
          {reasonEntries.map(([reason, value]) => (
            <div
              key={reason}
              className="flex items-center justify-between gap-3 text-xs text-slate-700"
            >
              <span className="truncate">{reason}</span>
              <span className="font-semibold tabular-nums">
                {formatNumber(value)} min
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GenericTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload || {};

  return (
    <div className="min-w-[220px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-slate-900">{label}</p>
      <div className="space-y-1 text-xs text-slate-700">
        {payload.map((item) => (
          <div
            key={`${item.dataKey}-${item.name}`}
            className="flex items-center justify-between gap-3"
          >
            <span>{item.name}</span>
            <span className="font-semibold tabular-nums">
              {item.name?.includes("%")
                ? formatPercent(item.value)
                : formatNumber(item.value)}
            </span>
          </div>
        ))}
        {row.hall || row.machine || row.part ? (
          <div className="space-y-1 border-t border-slate-200 pt-2">
            <div className="flex items-center justify-between">
              <span>Hall</span>
              <span className="font-semibold">{row.hall || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Machine</span>
              <span className="font-semibold">{row.machine || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Part</span>
              <span className="font-semibold">{row.part || "-"}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function buildFilterOptions(rows, selectedHall, selectedMachine) {
  const hallOptions = [
    ...new Set(rows.map((row) => row.hall).filter(Boolean)),
  ].sort((a, b) => String(a).localeCompare(String(b)));

  const machineOptions = [
    ...new Set(
      rows
        .filter(
          (row) =>
            selectedHall === "all" || String(row.hall) === String(selectedHall),
        )
        .map((row) => row.machine)
        .filter(Boolean),
    ),
  ].sort((a, b) => String(a).localeCompare(String(b)));

  const partOptions = [
    ...new Set(
      rows
        .filter(
          (row) =>
            selectedHall === "all" || String(row.hall) === String(selectedHall),
        )
        .filter(
          (row) =>
            selectedMachine === "all" ||
            String(row.machine) === String(selectedMachine),
        )
        .map((row) => row.part)
        .filter(Boolean),
    ),
  ].sort((a, b) => String(a).localeCompare(String(b)));

  return { hallOptions, machineOptions, partOptions };
}

function filterRows(rows, filters) {
  return rows
    .filter(
      (row) =>
        filters.hall === "all" || String(row.hall) === String(filters.hall),
    )
    .filter(
      (row) =>
        filters.machine === "all" ||
        String(row.machine) === String(filters.machine),
    )
    .filter(
      (row) =>
        filters.part === "all" || String(row.part) === String(filters.part),
    );
}

function aggregateRows(rows, groupBy) {
  const grouped = {};

  rows.forEach((row) => {
    const key = row[groupBy] || "Unknown";

    if (!grouped[key]) {
      grouped[key] = {
        label: key,
        hall: row.hall || "",
        machine: row.machine || "",
        part: row.part || "",
        actual: 0,
        good: 0,
        reject: 0,
        target: 0,
        lossQty: 0,
        lossMinutes: 0,
        rejectionReasons: {},
        lossReasons: {},
      };
    }

    grouped[key].actual += toNumber(row.actual);
    grouped[key].good += toNumber(row.good);
    grouped[key].reject += toNumber(row.reject);
    grouped[key].target += toNumber(row.target);
    grouped[key].lossQty += toNumber(row.lossQty);
    grouped[key].lossMinutes += toNumber(row.lossMinutes);

    (row.rejectBreakdown || []).forEach((item) => {
      const reason = item?.reason || "Other";
      grouped[key].rejectionReasons[reason] =
        toNumber(grouped[key].rejectionReasons[reason]) + toNumber(item?.qty);
    });

    (row.lossTimeBreakdown || []).forEach((item) => {
      const reason = item?.reason || "Other";
      grouped[key].lossReasons[reason] =
        toNumber(grouped[key].lossReasons[reason]) + toNumber(item?.minutes);
    });
  });

  return Object.values(grouped)
    .map((item) => ({
      ...item,
      shortLabel: truncateLabel(item.label, 16),
      efficiency: item.target > 0 ? (item.actual / item.target) * 100 : 0,
      rejectRate: item.actual > 0 ? (item.reject / item.actual) * 100 : 0,
    }))
    .filter((item) => {
      return (
        item.actual > 0 ||
        item.good > 0 ||
        item.reject > 0 ||
        item.target > 0 ||
        item.lossQty > 0 ||
        item.lossMinutes > 0
      );
    });
}

function getDefaultGroupBy(filters) {
  if (filters.machine === "all") return "machine";
  return "part";
}

export default function ProductionInsightsChart({
  machineHourlyTrend = [],
  hourlyTable = [],
}) {
  const normalizedRows = useMemo(() => {
    const rows = [];

    (machineHourlyTrend || []).forEach((machineBlock) => {
      const machineName = normalizeMachineName(machineBlock);
      const blockHall = machineBlock.hall || "";
      const blockPart = normalizePartName(machineBlock);

      if (Array.isArray(machineBlock.data) && machineBlock.data.length) {
        machineBlock.data.forEach((row) => {
          rows.push({
            hall: row.hall || blockHall || "",
            machine: row.machine || machineName,
            part: normalizePartName(row) || blockPart,
            actual: toNumber(row.actual),
            good: toNumber(row.good),
            reject: toNumber(row.reject),
            target: toNumber(row.target),
            lossQty: toNumber(row.lossQty ?? row.lossTime ?? 0),
            lossMinutes: toNumber(row.lossMinutes ?? row.lossTimeMinutes ?? 0),
            rejectBreakdown: Array.isArray(row.rejectBreakdown)
              ? row.rejectBreakdown
              : [],
            lossTimeBreakdown: Array.isArray(row.lossTimeBreakdown)
              ? row.lossTimeBreakdown
              : [],
          });
        });
      } else {
        rows.push({
          hall: blockHall,
          machine: machineName,
          part: blockPart,
          actual: toNumber(machineBlock.actual),
          good: toNumber(machineBlock.good),
          reject: toNumber(machineBlock.reject),
          target: toNumber(machineBlock.target),
          lossQty: toNumber(machineBlock.lossQty ?? machineBlock.lossTime ?? 0),
          lossMinutes: toNumber(
            machineBlock.lossMinutes ?? machineBlock.lossTimeMinutes ?? 0,
          ),
          rejectBreakdown: Array.isArray(machineBlock.rejectBreakdown)
            ? machineBlock.rejectBreakdown
            : [],
          lossTimeBreakdown: Array.isArray(machineBlock.lossTimeBreakdown)
            ? machineBlock.lossTimeBreakdown
            : [],
        });
      }
    });

    if (!rows.length && Array.isArray(hourlyTable)) {
      hourlyTable.forEach((row) => {
        rows.push({
          hall: row.hall || "",
          machine: normalizeMachineName(row),
          part: normalizePartName(row),
          actual: toNumber(row.actual),
          good: toNumber(row.good),
          reject: toNumber(row.reject),
          target: toNumber(row.target),
          lossQty: toNumber(row.lossQty ?? row.lossTime ?? 0),
          lossMinutes: toNumber(row.lossMinutes ?? row.lossTimeMinutes ?? 0),
          rejectBreakdown: Array.isArray(row.rejectBreakdown)
            ? row.rejectBreakdown
            : [],
          lossTimeBreakdown: Array.isArray(row.lossTimeBreakdown)
            ? row.lossTimeBreakdown
            : [],
        });
      });
    }

    return rows;
  }, [machineHourlyTrend, hourlyTable]);

  const [overallFilters, setOverallFilters] = useState({
    hall: "all",
    machine: "all",
    part: "all",
  });
  const [efficiencyFilters, setEfficiencyFilters] = useState({
    hall: "all",
    machine: "all",
    part: "all",
  });
  const [rejectionFilters, setRejectionFilters] = useState({
    hall: "all",
    machine: "all",
    part: "all",
  });
  const [lossFilters, setLossFilters] = useState({
    hall: "all",
    machine: "all",
    part: "all",
  });

  const overallOptions = useMemo(
    () =>
      buildFilterOptions(
        normalizedRows,
        overallFilters.hall,
        overallFilters.machine,
      ),
    [normalizedRows, overallFilters.hall, overallFilters.machine],
  );

  const efficiencyOptions = useMemo(
    () =>
      buildFilterOptions(
        normalizedRows,
        efficiencyFilters.hall,
        efficiencyFilters.machine,
      ),
    [normalizedRows, efficiencyFilters.hall, efficiencyFilters.machine],
  );

  const rejectionOptions = useMemo(
    () =>
      buildFilterOptions(
        normalizedRows,
        rejectionFilters.hall,
        rejectionFilters.machine,
      ),
    [normalizedRows, rejectionFilters.hall, rejectionFilters.machine],
  );

  const lossOptions = useMemo(
    () =>
      buildFilterOptions(normalizedRows, lossFilters.hall, lossFilters.machine),
    [normalizedRows, lossFilters.hall, lossFilters.machine],
  );

  useEffect(() => {
    if (
      overallFilters.machine !== "all" &&
      !overallOptions.machineOptions.includes(overallFilters.machine)
    ) {
      setOverallFilters((prev) => ({ ...prev, machine: "all", part: "all" }));
    }
    if (
      overallFilters.part !== "all" &&
      !overallOptions.partOptions.includes(overallFilters.part)
    ) {
      setOverallFilters((prev) => ({ ...prev, part: "all" }));
    }
  }, [overallFilters.machine, overallFilters.part, overallOptions]);

  useEffect(() => {
    if (
      efficiencyFilters.machine !== "all" &&
      !efficiencyOptions.machineOptions.includes(efficiencyFilters.machine)
    ) {
      setEfficiencyFilters((prev) => ({
        ...prev,
        machine: "all",
        part: "all",
      }));
    }
    if (
      efficiencyFilters.part !== "all" &&
      !efficiencyOptions.partOptions.includes(efficiencyFilters.part)
    ) {
      setEfficiencyFilters((prev) => ({ ...prev, part: "all" }));
    }
  }, [efficiencyFilters.machine, efficiencyFilters.part, efficiencyOptions]);

  useEffect(() => {
    if (
      rejectionFilters.machine !== "all" &&
      !rejectionOptions.machineOptions.includes(rejectionFilters.machine)
    ) {
      setRejectionFilters((prev) => ({ ...prev, machine: "all", part: "all" }));
    }
    if (
      rejectionFilters.part !== "all" &&
      !rejectionOptions.partOptions.includes(rejectionFilters.part)
    ) {
      setRejectionFilters((prev) => ({ ...prev, part: "all" }));
    }
  }, [rejectionFilters.machine, rejectionFilters.part, rejectionOptions]);

  useEffect(() => {
    if (
      lossFilters.machine !== "all" &&
      !lossOptions.machineOptions.includes(lossFilters.machine)
    ) {
      setLossFilters((prev) => ({ ...prev, machine: "all", part: "all" }));
    }
    if (
      lossFilters.part !== "all" &&
      !lossOptions.partOptions.includes(lossFilters.part)
    ) {
      setLossFilters((prev) => ({ ...prev, part: "all" }));
    }
  }, [lossFilters.machine, lossFilters.part, lossOptions]);

  const overallFilteredRows = useMemo(
    () => filterRows(normalizedRows, overallFilters),
    [normalizedRows, overallFilters],
  );
  const efficiencyFilteredRows = useMemo(
    () => filterRows(normalizedRows, efficiencyFilters),
    [normalizedRows, efficiencyFilters],
  );
  const rejectionFilteredRows = useMemo(
    () => filterRows(normalizedRows, rejectionFilters),
    [normalizedRows, rejectionFilters],
  );
  const lossFilteredRows = useMemo(
    () => filterRows(normalizedRows, lossFilters),
    [normalizedRows, lossFilters],
  );

  const overallGroupedData = useMemo(
    () => aggregateRows(overallFilteredRows, getDefaultGroupBy(overallFilters)),
    [overallFilteredRows, overallFilters],
  );
  const efficiencyGroupedData = useMemo(
    () =>
      aggregateRows(
        efficiencyFilteredRows,
        getDefaultGroupBy(efficiencyFilters),
      ),
    [efficiencyFilteredRows, efficiencyFilters],
  );
  const rejectionGroupedData = useMemo(
    () =>
      aggregateRows(rejectionFilteredRows, getDefaultGroupBy(rejectionFilters)),
    [rejectionFilteredRows, rejectionFilters],
  );
  const lossGroupedData = useMemo(
    () => aggregateRows(lossFilteredRows, getDefaultGroupBy(lossFilters)),
    [lossFilteredRows, lossFilters],
  );

  const summary = useMemo(() => {
    const totals = normalizedRows.reduce(
      (acc, row) => {
        acc.actual += toNumber(row.actual);
        acc.good += toNumber(row.good);
        acc.reject += toNumber(row.reject);
        acc.target += toNumber(row.target);
        acc.lossQty += toNumber(row.lossQty);
        acc.lossMinutes += toNumber(row.lossMinutes);
        return acc;
      },
      {
        actual: 0,
        good: 0,
        reject: 0,
        target: 0,
        lossQty: 0,
        lossMinutes: 0,
      },
    );

    totals.efficiency =
      totals.target > 0 ? (totals.actual / totals.target) * 100 : 0;
    totals.rejectRate =
      totals.actual > 0 ? (totals.reject / totals.actual) * 100 : 0;
    return totals;
  }, [normalizedRows]);

  const rejectionReasonMap = useMemo(() => {
    const reasonMap = {};
    rejectionGroupedData.forEach((item) => {
      Object.entries(item.rejectionReasons || {}).forEach(([reason, value]) => {
        reasonMap[reason] = toNumber(reasonMap[reason]) + toNumber(value);
      });
    });
    return reasonMap;
  }, [rejectionGroupedData]);

  const lossReasonMap = useMemo(() => {
    const reasonMap = {};
    lossGroupedData.forEach((item) => {
      Object.entries(item.lossReasons || {}).forEach(([reason, value]) => {
        reasonMap[reason] = toNumber(reasonMap[reason]) + toNumber(value);
      });
    });
    return reasonMap;
  }, [lossGroupedData]);

  const rejectionOverviewData = useMemo(
    () =>
      [...rejectionGroupedData].sort(
        (a, b) => toNumber(b.reject) - toNumber(a.reject),
      ),
    [rejectionGroupedData],
  );

  const lossOverviewData = useMemo(
    () =>
      [...lossGroupedData].sort(
        (a, b) => toNumber(b.lossMinutes) - toNumber(a.lossMinutes),
      ),
    [lossGroupedData],
  );

  const rejectionReasonData = useMemo(() => {
    return Object.entries(rejectionReasonMap)
      .map(([reason, qty]) => ({
        label: reason,
        shortLabel: truncateLabel(reason, 16),
        qty: toNumber(qty),
      }))
      .sort((a, b) => b.qty - a.qty);
  }, [rejectionReasonMap]);

  const lossReasonData = useMemo(() => {
    return Object.entries(lossReasonMap)
      .map(([reason, minutes]) => ({
        label: reason,
        shortLabel: truncateLabel(reason, 16),
        minutes: toNumber(minutes),
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [lossReasonMap]);

  const isSingleRejectionEntity = rejectionOverviewData.length <= 1;
  const isSingleLossEntity = lossOverviewData.length <= 1;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 md:text-lg">
            Efficiency, Rejection and Loss Analysis
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Compact operational insights across hall, machine, and part levels.
          </p>
        </div>

        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
          {normalizedRows.length} records
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <SummaryCard label="Actual" value={formatNumber(summary.actual)} />
        <SummaryCard
          label="Good"
          value={formatNumber(summary.good)}
          tone="good"
        />
        <SummaryCard
          label="Reject"
          value={formatNumber(summary.reject)}
          tone="reject"
        />
        <SummaryCard
          label="Loss Qty"
          value={formatNumber(summary.lossQty)}
          tone="loss"
        />
        <SummaryCard
          label="Loss Min"
          value={formatNumber(summary.lossMinutes)}
          tone="loss"
        />
        <SummaryCard
          label="Efficiency"
          value={`${summary.efficiency.toFixed(1)}%`}
          tone="efficiency"
          helper="Actual / Target × 100"
        />
      </div>

      {overallGroupedData.length > 0 ? (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-3">
          <ChartFilterRow
            title="Overall Composition"
            subtitle="Target, good output, reject quantity, and loss minutes in grouped vertical bars."
            hall={overallFilters.hall}
            machine={overallFilters.machine}
            part={overallFilters.part}
            hallOptions={overallOptions.hallOptions}
            machineOptions={overallOptions.machineOptions}
            partOptions={overallOptions.partOptions}
            onHallChange={(e) =>
              setOverallFilters({
                hall: e.target.value,
                machine: "all",
                part: "all",
              })
            }
            onMachineChange={(e) =>
              setOverallFilters((prev) => ({
                ...prev,
                machine: e.target.value,
                part: "all",
              }))
            }
            onPartChange={(e) =>
              setOverallFilters((prev) => ({ ...prev, part: e.target.value }))
            }
            rightText={`${overallGroupedData.length} items`}
          />

          <div style={{ height: 340 }} className="w-full">
         <ResponsiveContainer width="100%" height="100%">
  <BarChart
    data={[...overallGroupedData].sort(
      (a, b) => toNumber(b.target) - toNumber(a.target),
    )}
    margin={{
      top: 45,
      right: 12,
      left: 0,
      bottom: 8,
    }}
    barCategoryGap={22}
    barGap={4}
  >
    <CartesianGrid
      stroke={INDUSTRY_COLORS.grid}
      strokeDasharray="3 3"
      vertical={false}
    />

    <XAxis
      dataKey="shortLabel"
      interval={0}
      angle={overallGroupedData.length > 8 ? -20 : 0}
      textAnchor={
        overallGroupedData.length > 8 ? "end" : "middle"
      }
      height={overallGroupedData.length > 8 ? 56 : 34}
      tick={{
        fontSize: 11,
        fill: INDUSTRY_COLORS.textMuted,
      }}
    />

    <YAxis
      width={64}
      domain={[0, "dataMax + 50"]}
      tick={{
        fontSize: 11,
        fill: INDUSTRY_COLORS.textMuted,
      }}
    />

    <Tooltip content={<GenericTooltip />} />
    <Legend />

    <Bar
      dataKey="target"
      name="Target"
      fill={INDUSTRY_COLORS.target}
      radius={[4, 4, 0, 0]}
      barSize={COMPACT_BAR_SIZE}
      maxBarSize={COMPACT_BAR_SIZE}
    >
      <LabelList
        dataKey="target"
        position="top"
        offset={8}
        formatter={(value) =>
          value > 0 ? formatNumber(value) : ""
        }
        style={{
          fill: INDUSTRY_COLORS.target,
          fontSize: 11,
          fontWeight: 700,
        }}
      />
    </Bar>

    <Bar
      dataKey="good"
      name="Good"
      fill={INDUSTRY_COLORS.good}
      radius={[4, 4, 0, 0]}
      barSize={COMPACT_BAR_SIZE}
      maxBarSize={COMPACT_BAR_SIZE}
    >
      <LabelList
        dataKey="good"
        position="top"
        offset={8}
        formatter={(value) =>
          value > 0 ? formatNumber(value) : ""
        }
        style={{
          fill: INDUSTRY_COLORS.good,
          fontSize: 11,
          fontWeight: 700,
        }}
      />
    </Bar>

    <Bar
      dataKey="reject"
      name="Reject"
      fill={INDUSTRY_COLORS.reject}
      radius={[4, 4, 0, 0]}
      barSize={COMPACT_BAR_SIZE}
      maxBarSize={COMPACT_BAR_SIZE}
    >
      <LabelList
        dataKey="reject"
        position="top"
        offset={8}
        formatter={(value) =>
          value > 0 ? formatNumber(value) : ""
        }
        style={{
          fill: INDUSTRY_COLORS.reject,
          fontSize: 11,
          fontWeight: 700,
        }}
      />
    </Bar>

    <Bar
      dataKey="lossMinutes"
      name="Loss Minutes"
      fill={INDUSTRY_COLORS.loss}
      radius={[4, 4, 0, 0]}
      barSize={COMPACT_BAR_SIZE}
      maxBarSize={COMPACT_BAR_SIZE}
    >
      <LabelList
        dataKey="lossMinutes"
        position="top"
        offset={8}
        formatter={(value) =>
          value > 0 ? formatNumber(value) : ""
        }
        style={{
          fill: INDUSTRY_COLORS.loss,
          fontSize: 11,
          fontWeight: 700,
        }}
      />
    </Bar>
  </BarChart>
</ResponsiveContainer>
          </div>
        </div>
      ) : (
        <EmptyState text="Overall comparison data is not available." />
      )}

      {efficiencyGroupedData.length > 0 ? (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-3">
          <ChartFilterRow
            title="Efficiency Graph"
            subtitle="Actual-to-target efficiency in vertical bar format."
            hall={efficiencyFilters.hall}
            machine={efficiencyFilters.machine}
            part={efficiencyFilters.part}
            hallOptions={efficiencyOptions.hallOptions}
            machineOptions={efficiencyOptions.machineOptions}
            partOptions={efficiencyOptions.partOptions}
            onHallChange={(e) =>
              setEfficiencyFilters({
                hall: e.target.value,
                machine: "all",
                part: "all",
              })
            }
            onMachineChange={(e) =>
              setEfficiencyFilters((prev) => ({
                ...prev,
                machine: e.target.value,
                part: "all",
              }))
            }
            onPartChange={(e) =>
              setEfficiencyFilters((prev) => ({
                ...prev,
                part: e.target.value,
              }))
            }
            rightText={`${efficiencyGroupedData.length} items`}
          />

          <div style={{ height: 360 }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...efficiencyGroupedData].sort(
                  (a, b) => toNumber(b.efficiency) - toNumber(a.efficiency),
                )}
                margin={{ top: 16, right: 18, left: 0, bottom: 8 }}
                barCategoryGap={22}
                barGap={0}
              >
                <CartesianGrid
                  stroke={INDUSTRY_COLORS.grid}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="shortLabel"
                  interval={0}
                  angle={efficiencyGroupedData.length > 8 ? -20 : 0}
                  textAnchor={
                    efficiencyGroupedData.length > 8 ? "end" : "middle"
                  }
                  height={efficiencyGroupedData.length > 8 ? 56 : 34}
                  tick={{ fontSize: 11, fill: INDUSTRY_COLORS.textMuted }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: INDUSTRY_COLORS.textMuted }}
                  tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                />
                <Tooltip content={<EfficiencyTooltip />} />
                <Bar
                  dataKey="efficiency"
                  name="Efficiency %"
                  fill={INDUSTRY_COLORS.efficiency}
                  radius={[4, 4, 0, 0]}
                  barSize={FIXED_BAR_SIZE}
                  maxBarSize={FIXED_BAR_SIZE}
                >
                  <LabelList
                    dataKey="efficiency"
                    position="top"
                    formatter={formatPercent}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <EmptyState text="Efficiency graph data is not available." />
      )}

      {isSingleRejectionEntity ? (
        rejectionReasonData.length > 0 ? (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-3">
            <ChartFilterRow
              title="Rejection Graph"
              subtitle="Reason-wise rejection in vertical bars."
              hall={rejectionFilters.hall}
              machine={rejectionFilters.machine}
              part={rejectionFilters.part}
              hallOptions={rejectionOptions.hallOptions}
              machineOptions={rejectionOptions.machineOptions}
              partOptions={rejectionOptions.partOptions}
              onHallChange={(e) =>
                setRejectionFilters({
                  hall: e.target.value,
                  machine: "all",
                  part: "all",
                })
              }
              onMachineChange={(e) =>
                setRejectionFilters((prev) => ({
                  ...prev,
                  machine: e.target.value,
                  part: "all",
                }))
              }
              onPartChange={(e) =>
                setRejectionFilters((prev) => ({
                  ...prev,
                  part: e.target.value,
                }))
              }
              rightText={`${rejectionReasonData.length} reasons`}
            />

            <div style={{ height: 380 }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rejectionReasonData}
                  margin={{ top: 16, right: 20, left: 0, bottom: 8 }}
                  barCategoryGap={20}
                  barGap={0}
                >
                  <CartesianGrid
                    stroke={INDUSTRY_COLORS.grid}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="shortLabel"
                    interval={0}
                    angle={rejectionReasonData.length > 8 ? -20 : 0}
                    textAnchor={
                      rejectionReasonData.length > 8 ? "end" : "middle"
                    }
                    height={rejectionReasonData.length > 8 ? 56 : 34}
                    tick={{ fontSize: 11, fill: INDUSTRY_COLORS.textMuted }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: INDUSTRY_COLORS.textMuted }}
                  />
                  <Tooltip content={<GenericTooltip />} />
                  <Bar
                    dataKey="qty"
                    name="Reject Qty"
                    fill={INDUSTRY_COLORS.reject}
                    radius={[4, 4, 0, 0]}
                    barSize={FIXED_BAR_SIZE}
                    maxBarSize={FIXED_BAR_SIZE}
                  >
                    <LabelList
                      dataKey="qty"
                      position="top"
                      formatter={(value) => formatNumber(value)}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <EmptyState text="Rejection graph data is not available." />
        )
      ) : rejectionOverviewData.length > 0 ? (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-3">
          <ChartFilterRow
            title="Rejection Graph"
            subtitle="Reject quantity and reject rate comparison across multiple items."
            hall={rejectionFilters.hall}
            machine={rejectionFilters.machine}
            part={rejectionFilters.part}
            hallOptions={rejectionOptions.hallOptions}
            machineOptions={rejectionOptions.machineOptions}
            partOptions={rejectionOptions.partOptions}
            onHallChange={(e) =>
              setRejectionFilters({
                hall: e.target.value,
                machine: "all",
                part: "all",
              })
            }
            onMachineChange={(e) =>
              setRejectionFilters((prev) => ({
                ...prev,
                machine: e.target.value,
                part: "all",
              }))
            }
            onPartChange={(e) =>
              setRejectionFilters((prev) => ({ ...prev, part: e.target.value }))
            }
            rightText={`${rejectionOverviewData.length} items`}
          />

          <div style={{ height: 360 }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={rejectionOverviewData}
                margin={{
                  top: 40,
                  right: 18,
                  left: 0,
                  bottom: 8,
                }}
                barCategoryGap="24%"
              >
                <CartesianGrid
                  stroke={INDUSTRY_COLORS.grid}
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="shortLabel"
                  interval={0}
                  angle={rejectionOverviewData.length > 8 ? -20 : 0}
                  textAnchor={
                    rejectionOverviewData.length > 8 ? "end" : "middle"
                  }
                  height={rejectionOverviewData.length > 8 ? 56 : 34}
                  tick={{
                    fontSize: 11,
                    fill: INDUSTRY_COLORS.textMuted,
                  }}
                />

                <YAxis
                  yAxisId="left"
                  width={64}
                  domain={[0, "dataMax + 20"]}
                  tick={{
                    fontSize: 11,
                    fill: INDUSTRY_COLORS.textMuted,
                  }}
                />

                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, "dataMax + 5"]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{
                    fontSize: 11,
                    fill: INDUSTRY_COLORS.textMuted,
                  }}
                />

                <Tooltip content={<RejectionTooltip />} />
                <Legend />

                <Bar
                  yAxisId="left"
                  dataKey="reject"
                  name="Reject Qty"
                  fill={INDUSTRY_COLORS.reject}
                  radius={[4, 4, 0, 0]}
                  barSize={FIXED_BAR_SIZE}
                  maxBarSize={FIXED_BAR_SIZE}
                >
                  <LabelList
                    dataKey="reject"
                    position="top"
                    offset={10}
                    formatter={(value) =>
                      value > 0 ? formatNumber(value) : ""
                    }
                    style={{
                      fill: INDUSTRY_COLORS.reject,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  />
                </Bar>

                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="rejectRate"
                  name="Reject Rate %"
                  stroke={INDUSTRY_COLORS.rejectSoft}
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: INDUSTRY_COLORS.rejectSoft,
                  }}
                >
                  {/* <LabelList
                    dataKey="rejectRate"
                    position="centerBottom"
                    offset={8}
                    formatter={(value) =>
                      value > 0 ? `${Number(value).toFixed(1)}%` : ""
                    }
                    style={{
                      fill: INDUSTRY_COLORS.rejectSoft,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  /> */}
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <EmptyState text="Rejection graph data is not available." />
      )}

      {isSingleLossEntity ? (
        lossReasonData.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <ChartFilterRow
              title="Loss Time Graph"
              subtitle="Reason-wise loss minutes in vertical bars."
              hall={lossFilters.hall}
              machine={lossFilters.machine}
              part={lossFilters.part}
              hallOptions={lossOptions.hallOptions}
              machineOptions={lossOptions.machineOptions}
              partOptions={lossOptions.partOptions}
              onHallChange={(e) =>
                setLossFilters({
                  hall: e.target.value,
                  machine: "all",
                  part: "all",
                })
              }
              onMachineChange={(e) =>
                setLossFilters((prev) => ({
                  ...prev,
                  machine: e.target.value,
                  part: "all",
                }))
              }
              onPartChange={(e) =>
                setLossFilters((prev) => ({ ...prev, part: e.target.value }))
              }
              rightText={`${lossReasonData.length} reasons`}
            />

            <div style={{ height: 380 }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={lossReasonData}
                  margin={{ top: 16, right: 20, left: 0, bottom: 8 }}
                  barCategoryGap={20}
                  barGap={0}
                >
                  <CartesianGrid
                    stroke={INDUSTRY_COLORS.grid}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="shortLabel"
                    interval={0}
                    angle={lossReasonData.length > 8 ? -20 : 0}
                    textAnchor={lossReasonData.length > 8 ? "end" : "middle"}
                    height={lossReasonData.length > 8 ? 56 : 34}
                    tick={{ fontSize: 11, fill: INDUSTRY_COLORS.textMuted }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: INDUSTRY_COLORS.textMuted }}
                  />
                  <Tooltip content={<GenericTooltip />} />
                  <Bar
                    dataKey="minutes"
                    name="Loss Minutes"
                    fill={INDUSTRY_COLORS.loss}
                    radius={[4, 4, 0, 0]}
                    barSize={FIXED_BAR_SIZE}
                    maxBarSize={FIXED_BAR_SIZE}
                  >
                    <LabelList
                      dataKey="minutes"
                      position="top"
                      formatter={(value) => formatNumber(value)}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <EmptyState text="Loss time graph data is not available." />
        )
      ) : lossOverviewData.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <ChartFilterRow
            title="Loss Time Graph"
            subtitle="Loss minutes comparison across multiple items."
            hall={lossFilters.hall}
            machine={lossFilters.machine}
            part={lossFilters.part}
            hallOptions={lossOptions.hallOptions}
            machineOptions={lossOptions.machineOptions}
            partOptions={lossOptions.partOptions}
            onHallChange={(e) =>
              setLossFilters({
                hall: e.target.value,
                machine: "all",
                part: "all",
              })
            }
            onMachineChange={(e) =>
              setLossFilters((prev) => ({
                ...prev,
                machine: e.target.value,
                part: "all",
              }))
            }
            onPartChange={(e) =>
              setLossFilters((prev) => ({ ...prev, part: e.target.value }))
            }
            rightText={`${lossOverviewData.length} items`}
          />

          <div style={{ height: 360 }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={lossOverviewData}
                margin={{ top: 16, right: 12, left: 0, bottom: 8 }}
                barCategoryGap="24%"
              >
                <CartesianGrid
                  stroke={INDUSTRY_COLORS.grid}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="shortLabel"
                  interval={0}
                  angle={lossOverviewData.length > 8 ? -20 : 0}
                  textAnchor={lossOverviewData.length > 8 ? "end" : "middle"}
                  height={lossOverviewData.length > 8 ? 56 : 34}
                  tick={{ fontSize: 11, fill: INDUSTRY_COLORS.textMuted }}
                />
                <YAxis
                  width={64}
                  tick={{ fontSize: 11, fill: INDUSTRY_COLORS.textMuted }}
                />
                <Tooltip content={<LossTooltip />} />
                <Bar
                  dataKey="lossMinutes"
                  name="Loss Min"
                  fill={INDUSTRY_COLORS.loss}
                  radius={[4, 4, 0, 0]}
                  barSize={FIXED_BAR_SIZE}
                  maxBarSize={FIXED_BAR_SIZE}
                >
                  <LabelList
                    dataKey="lossMinutes"
                    position="top"
                    formatter={(value) => formatNumber(value)}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <EmptyState text="Loss time graph data is not available." />
      )}
    </section>
  );
}
