import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
} from "recharts";

function getPerformanceColor(actual, target, theme = "light") {
  const colors =
    theme === "dark"
      ? {
          neutral: "#38bdf8",
          success: "#22c55e",
          warning: "#f59e0b",
          danger: "#ef4444",
        }
      : {
          neutral: "#475569",
          success: "#15803d",
          warning: "#b45309",
          danger: "#b91c1c",
        };

  if (!target || target <= 0) return colors.neutral;

  const ratio = actual / target;
  if (ratio >= 1) return colors.success;
  if (ratio >= 0.8) return colors.warning;
  return colors.danger;
}

function getThemeTokens(theme = "light") {
  if (theme === "dark") {
    return {
      sectionBg: "bg-slate-950",
      cardBg: "bg-slate-950",
      panelBg: "bg-slate-950",
      softBg: "bg-slate-900",
      softBgStrong: "bg-slate-950",
      border: "border-slate-800",
      title: "text-slate-100",
      text: "text-slate-300",
      muted: "text-slate-500",
      grid: "rgba(148,163,184,0.12)",
      axis: "#94a3b8",
      tooltipBg: "rgba(2, 6, 23, 0.98)",
      actual: "#38bdf8",
      good: "#22c55e",
      reject: "#f43f5e",
      target: "#f59e0b",
      lossQty: "#a78bfa",
      lossMinutes: "#f97316",
      badge: "bg-slate-900 text-slate-200 border-slate-700",
      chip: "bg-slate-900 text-slate-300 border-slate-700",
      input: "bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500",
      scrollbarThumb: "rgba(148,163,184,0.35)",
      scrollbarTrack: "rgba(255,255,255,0.04)",
    };
  }

  return {
    sectionBg: "bg-white",
    cardBg: "bg-white",
    panelBg: "bg-white",
    softBg: "bg-slate-50",
    softBgStrong: "bg-white",
    border: "border-slate-300",
    title: "text-slate-900",
    text: "text-slate-700",
    muted: "text-slate-500",
    grid: "rgba(148,163,184,0.18)",
    axis: "#64748b",
    tooltipBg: "rgba(255,255,255,0.98)",
    actual: "#0369a1",
    good: "#15803d",
    reject: "#be123c",
    target: "#b45309",
    lossQty: "#7c3aed",
    lossMinutes: "#ea580c",
    badge: "bg-slate-100 text-slate-700 border-slate-300",
    chip: "bg-slate-50 text-slate-700 border-slate-300",
    input: "bg-white border-slate-300 text-slate-800 placeholder:text-slate-400",
    scrollbarThumb: "rgba(100,116,139,0.45)",
    scrollbarTrack: "rgba(148,163,184,0.10)",
  };
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value) {
  return toNumber(value).toLocaleString("en-IN");
}

function formatDateTime(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseHourLabelToMinutes(label) {
  const raw = String(label || "")
    .trim()
    .toUpperCase();

  if (!raw) return Number.MAX_SAFE_INTEGER;

  const firstPart = raw.split("-")[0]?.trim() || raw;
  const match = firstPart.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/);

  if (!match) return Number.MAX_SAFE_INTEGER;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const period = match[3];

  if (period === "AM" && hours === 12) hours = 0;
  if (period === "PM" && hours !== 12) hours += 12;

  return hours * 60 + minutes;
}

function toDateInputValue(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function isRowInDateRange(row, fromDate, toDate) {
  const rawValue = row?.createdAt || row?.date || row?.updatedAt;
  if (!fromDate && !toDate) return true;
  if (!rawValue) return false;

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return false;

  const rowDateOnly = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  );

  if (fromDate) {
    const from = new Date(fromDate);
    if (rowDateOnly < from) return false;
  }

  if (toDate) {
    const to = new Date(toDate);
    if (rowDateOnly > to) return false;
  }

  return true;
}

function buildRejectBreakdownText(rejectBreakdown = [], rejectReason, reject = 0) {
  if (Array.isArray(rejectBreakdown) && rejectBreakdown.length) {
    return rejectBreakdown
      .filter((item) => item?.reason || toNumber(item?.qty) > 0)
      .map((item) => `${item?.reason || "Other"} ${formatNumber(item?.qty || 0)}`)
      .join(", ");
  }

  if (rejectReason && toNumber(reject) > 0) {
    return `${rejectReason} ${formatNumber(reject)}`;
  }

  return "-";
}

function buildLossBreakdownText(lossTimeBreakdown = []) {
  if (!Array.isArray(lossTimeBreakdown) || !lossTimeBreakdown.length) return "-";

  return lossTimeBreakdown
    .filter((item) => item?.reason || toNumber(item?.qty) > 0 || toNumber(item?.minutes) > 0)
    .map((item) => {
      const reason = item?.reason || "Other";
      const qty = formatNumber(item?.qty || 0);
      const minutes = formatNumber(item?.minutes || 0);
      const person = item?.person ? ` - ${item.person}` : "";
      return `${reason} qty ${qty}, ${minutes} min${person}`;
    })
    .join(", ");
}

function normalizeRow(row = {}, machine = {}) {
  const actual = toNumber(row.actual ?? row.value ?? row.qty ?? row.production);
  const reject = toNumber(row.reject);
  const target = toNumber(row.target);
  const lossTime = toNumber(row.lossTime);
  const lossMinutes =
    row.lossMinutes !== undefined && row.lossMinutes !== null
      ? toNumber(row.lossMinutes)
      : toNumber(row.lossTimeMinutes);

  const rejectBreakdown = Array.isArray(row.rejectBreakdown) ? row.rejectBreakdown : [];
  const lossTimeBreakdown = Array.isArray(row.lossTimeBreakdown) ? row.lossTimeBreakdown : [];

  return {
    ...row,
    hour: row.hour || row.label || row.slot || row.duration || row.time || "Unknown",
    actual,
    good: toNumber(row.good ?? actual - reject),
    reject,
    target,
    lossTime,
    lossMinutes,
    hall: row.hall || machine.hall || "",
    shift: row.shift || machine.shift || "",
    machine: row.machine || machine.machine || machine.machineDisplayName || "",
    machineCode: row.machineCode || machine.machineCode || "",
    machineName: row.machineName || machine.machineName || "",
    operator: row.operator || machine.operator || "",
    operatorId: row.operatorId || machine.operatorId || "",
    part: row.part || machine.part || "",
    rejectReason: row.rejectReason,
    rejectBreakdown,
    lossTimeBreakdown,
    rejectBreakdownText:
      row.rejectBreakdownText || buildRejectBreakdownText(rejectBreakdown, row.rejectReason, reject),
    lossTimeBreakdownText:
      row.lossTimeBreakdownText || buildLossBreakdownText(lossTimeBreakdown),
    createdAt: row.createdAt || row.updatedAt || row.date || "",
    date: row.date || row.createdAt || row.updatedAt || "",
  };
}

function normalizeMachineItem(machine = {}) {
  const rawRows = Array.isArray(machine.data)
    ? machine.data
    : Array.isArray(machine.rows)
    ? machine.rows
    : [];

  const normalizedData = rawRows
    .map((row) => normalizeRow(row, machine))
    .sort((a, b) => parseHourLabelToMinutes(a.hour) - parseHourLabelToMinutes(b.hour));

  const firstRow = normalizedData[0] || {};

  return {
    ...machine,
    hall: machine.hall || firstRow.hall || "",
    shift: machine.shift || firstRow.shift || "",
    machine:
      machine.machine ||
      machine.machineDisplayName ||
      firstRow.machine ||
      machine.machineCode ||
      "Unknown Machine",
    machineCode: machine.machineCode || firstRow.machineCode || "",
    machineName: machine.machineName || firstRow.machineName || "",
    operator: machine.operator || firstRow.operator || "",
    operatorId: machine.operatorId || firstRow.operatorId || "",
    part: machine.part || firstRow.part || "",
    data: normalizedData,
  };
}

function convertFlatRowsToMachineGroups(rows = []) {
  const grouped = rows.reduce((acc, row) => {
    const key =
      row?.machine ||
      row?.machineDisplayName ||
      row?.machineCode ||
      row?.machineName ||
      "Unknown Machine";

    if (!acc[key]) {
      acc[key] = {
        machine: row?.machine || row?.machineDisplayName || key,
        machineCode: row?.machineCode || "",
        machineName: row?.machineName || "",
        hall: row?.hall || "",
        shift: row?.shift || "",
        operator: row?.operator || "",
        operatorId: row?.operatorId || "",
        part: row?.part || "",
        data: [],
      };
    }

    acc[key].data.push(row);
    return acc;
  }, {});

  return Object.values(grouped).map((item) => normalizeMachineItem(item));
}

function normalizeMachineHourlyTrendShape(machineHourlyTrend = []) {
  if (!Array.isArray(machineHourlyTrend) || !machineHourlyTrend.length) return [];

  const first = machineHourlyTrend[0];
  if (Array.isArray(first?.data) || Array.isArray(first?.rows)) {
    return machineHourlyTrend.map((item) => normalizeMachineItem(item));
  }

  return convertFlatRowsToMachineGroups(machineHourlyTrend);
}

function TooltipRow({ label, value, color, muted }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={muted}>{label}</span>
      <span className="font-semibold tabular-nums" style={{ color }}>
        {typeof value === "number" ? formatNumber(value) : value}
      </span>
    </div>
  );
}

function TooltipText({ label, value, text, muted }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className={muted}>{label}</span>
      <span className={`font-medium text-right ${text}`}>{value}</span>
    </div>
  );
}

function CustomTooltip({ active, payload, label, theme = "light" }) {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload || {};
  const t = getThemeTokens(theme);
  const variance = toNumber(row.actual) - toNumber(row.target);
  const achievement =
    toNumber(row.target) > 0
      ? ((toNumber(row.actual) / toNumber(row.target)) * 100).toFixed(1)
      : "0.0";

  return (
    <div
      className="min-w-[270px] border px-3 py-3 shadow-sm"
      style={{
        background: t.tooltipBg,
        borderColor: theme === "dark" ? "#334155" : "#cbd5e1",
      }}
    >
      <p className={`text-sm font-bold ${t.title}`}>{label}</p>

      <div className="mt-3 space-y-2 text-sm">
        <TooltipRow label="Actual" value={row.actual} color={t.actual} muted={t.muted} />
        <TooltipRow label="Good" value={row.good} color={t.good} muted={t.muted} />
        <TooltipRow label="Reject" value={row.reject} color={t.reject} muted={t.muted} />
        <TooltipRow label="Target" value={row.target} color={t.target} muted={t.muted} />
        <TooltipRow label="Loss Qty" value={row.lossTime} color={t.lossQty} muted={t.muted} />
        <TooltipRow label="Loss Min" value={row.lossMinutes || 0} color={t.lossMinutes} muted={t.muted} />
        <TooltipRow
          label="Variance"
          value={variance}
          color={variance >= 0 ? t.good : t.reject}
          muted={t.muted}
        />
        <TooltipRow
          label="Achievement"
          value={`${achievement}%`}
          color={variance >= 0 ? t.good : t.target}
          muted={t.muted}
        />
        <TooltipText label="Shift" value={row.shift || "-"} text={t.text} muted={t.muted} />
        <TooltipText label="Part" value={row.part || "-"} text={t.text} muted={t.muted} />
        <TooltipText
          label="Operator"
          value={row.operatorId ? `${row.operator} - ${row.operatorId}` : row.operator || "-"}
          text={t.text}
          muted={t.muted}
        />
        <TooltipText
          label="Reject Detail"
          value={row.rejectBreakdownText || row.rejectReason || "-"}
          text={t.text}
          muted={t.muted}
        />
        <TooltipText
          label="Loss Detail"
          value={row.lossTimeBreakdownText || "-"}
          text={t.text}
          muted={t.muted}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value, valueColor, theme = "light", helper }) {
  const t = getThemeTokens(theme);

  return (
    <div className={`border px-3 py-3 ${t.softBg} ${t.border}`}>
      <p className={`text-[10px] uppercase tracking-[0.16em] font-bold ${t.muted}`}>{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums" style={{ color: valueColor }}>
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {helper ? <p className={`mt-1 text-xs ${t.muted}`}>{helper}</p> : null}
    </div>
  );
}

function MachineSummary({ machine, theme = "light" }) {
  const totals = machine.data.reduce(
    (acc, row) => {
      acc.actual += toNumber(row.actual);
      acc.good += toNumber(row.good);
      acc.reject += toNumber(row.reject);
      acc.target += toNumber(row.target);
      acc.lossTime += toNumber(row.lossTime);
      acc.lossMinutes += toNumber(row.lossMinutes);
      return acc;
    },
    { actual: 0, good: 0, reject: 0, target: 0, lossTime: 0, lossMinutes: 0 }
  );

  const t = getThemeTokens(theme);
  const rejectPercent =
    totals.actual > 0 ? `${((totals.reject / totals.actual) * 100).toFixed(2)}%` : "0.00%";
  const achievement =
    totals.target > 0 ? `${((totals.actual / totals.target) * 100).toFixed(1)}%` : "0.0%";

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-8">
      <MiniStat label="Actual" value={totals.actual} valueColor={t.actual} theme={theme} />
      <MiniStat label="Good" value={totals.good} valueColor={t.good} theme={theme} />
      <MiniStat label="Reject" value={totals.reject} valueColor={t.reject} theme={theme} />
      <MiniStat label="Target" value={totals.target} valueColor={t.target} theme={theme} />
      <MiniStat label="Loss Qty" value={totals.lossTime} valueColor={t.lossQty} theme={theme} />
      <MiniStat
        label="Loss Min"
        value={totals.lossMinutes}
        valueColor={t.lossMinutes}
        theme={theme}
      />
      <MiniStat label="Reject %" value={rejectPercent} valueColor={t.reject} theme={theme} />
      <MiniStat label="Achieve" value={achievement} valueColor={t.good} theme={theme} />
    </div>
  );
}

function FilterBar({
  filters,
  setFilters,
  hallOptions,
  shiftOptions,
  machineOptions,
  resultCount,
  theme = "light",
}) {
  const t = getThemeTokens(theme);

  return (
    <div className={`sticky top-0 z-10 border p-4 mb-4 ${t.softBgStrong} ${t.border}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] font-bold" style={{ color: t.actual }}>
            Filters
          </p>
          <h4 className={`mt-2 text-base font-bold ${t.title}`}>Machine hourly records</h4>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className={`inline-flex items-center border px-3 py-2 text-xs font-semibold ${t.badge}`}>
            Showing {resultCount} machine{resultCount !== 1 ? "s" : ""}
          </div>

          <button
            type="button"
            onClick={() =>
              setFilters({
                hall: "",
                shift: "",
                machine: "",
                search: "",
                fromDate: "",
                toDate: "",
                sortBy: "machine",
                chartMode: "mixed",
                density: "comfortable",
              })
            }
            className={`border px-3 py-2 text-xs font-semibold ${t.chip}`}
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-9">
        <select
          value={filters.hall}
          onChange={(e) => setFilters((prev) => ({ ...prev, hall: e.target.value }))}
          className={`h-11 border px-3 text-sm outline-none ${t.input}`}
        >
          <option value="">All Halls</option>
          {hallOptions.map((hall) => (
            <option key={hall} value={hall}>
              {hall}
            </option>
          ))}
        </select>

        <select
          value={filters.shift}
          onChange={(e) => setFilters((prev) => ({ ...prev, shift: e.target.value }))}
          className={`h-11 border px-3 text-sm outline-none ${t.input}`}
        >
          <option value="">All Shifts</option>
          {shiftOptions.map((shift) => (
            <option key={shift} value={shift}>
              {shift}
            </option>
          ))}
        </select>

        <select
          value={filters.machine}
          onChange={(e) => setFilters((prev) => ({ ...prev, machine: e.target.value }))}
          className={`h-11 border px-3 text-sm outline-none ${t.input}`}
        >
          <option value="">All Machines</option>
          {machineOptions.map((machine) => (
            <option key={machine} value={machine}>
              {machine}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search operator, part, code"
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          className={`h-11 border px-3 text-sm outline-none ${t.input}`}
        />

        <input
          type="date"
          value={filters.fromDate}
          onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))}
          className={`h-11 border px-3 text-sm outline-none ${t.input}`}
        />

        <input
          type="date"
          value={filters.toDate}
          onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))}
          className={`h-11 border px-3 text-sm outline-none ${t.input}`}
        />

        <select
          value={filters.sortBy}
          onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
          className={`h-11 border px-3 text-sm outline-none ${t.input}`}
        >
          <option value="machine">Sort: Machine</option>
          <option value="actualDesc">Sort: Actual High-Low</option>
          <option value="rejectDesc">Sort: Reject High-Low</option>
          <option value="lossTimeDesc">Sort: Loss Qty High-Low</option>
          <option value="lossMinutesDesc">Sort: Loss Min High-Low</option>
          <option value="hoursDesc">Sort: Hours High-Low</option>
        </select>

        <select
          value={filters.chartMode}
          onChange={(e) => setFilters((prev) => ({ ...prev, chartMode: e.target.value }))}
          className={`h-11 border px-3 text-sm outline-none ${t.input}`}
        >
          <option value="mixed">Mode: Mixed</option>
          <option value="bars">Mode: Bars Focus</option>
          <option value="lines">Mode: Lines Focus</option>
        </select>

        <select
          value={filters.density}
          onChange={(e) => setFilters((prev) => ({ ...prev, density: e.target.value }))}
          className={`h-11 border px-3 text-sm outline-none ${t.input}`}
        >
          <option value="comfortable">View: Comfortable</option>
          <option value="compact">View: Compact</option>
        </select>
      </div>
    </div>
  );
}

function RejectionReasonsBlock({ machine, theme = "light" }) {
  const t = getThemeTokens(theme);

  const reasonMap = machine.data.reduce((acc, row) => {
    const reasons = Array.isArray(row.rejectBreakdown) ? row.rejectBreakdown : [];

    reasons.forEach((item) => {
      const reason = item?.reason || "Other";
      const qty = toNumber(item?.qty);
      acc[reason] = (acc[reason] || 0) + qty;
    });

    if (!reasons.length && toNumber(row.reject) > 0 && row.rejectReason) {
      acc[row.rejectReason] = (acc[row.rejectReason] || 0) + toNumber(row.reject);
    }

    return acc;
  }, {});

  const entries = Object.entries(reasonMap).sort((a, b) => b[1] - a[1]);

  if (!entries.length) return null;

  return (
    <div className={`mt-4 border px-4 py-3 ${t.softBg} ${t.border}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-[11px] uppercase tracking-[0.16em] font-bold ${t.muted}`}>
          Rejection Reasons
        </p>
        <span className={`border px-2 py-1 text-xs font-semibold ${t.badge}`}>
          Top {entries[0]?.[0]} -
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {entries.map(([reason, qty]) => (
          <span key={reason} className={`border px-3 py-1 text-xs font-semibold ${t.chip}`}>
            {reason}: {formatNumber(qty)}
          </span>
        ))}
      </div>
    </div>
  );
}

function LossTimeBlock({ machine, theme = "light" }) {
  const t = getThemeTokens(theme);

  const breakdownMap = machine.data.reduce((acc, row) => {
    const items = Array.isArray(row.lossTimeBreakdown) ? row.lossTimeBreakdown : [];

    items.forEach((item) => {
      const key = item?.reason || "Other";
      const qty = toNumber(item?.qty);
      const minutes = toNumber(item?.minutes);

      if (!acc[key]) {
        acc[key] = { reason: key, qty: 0, minutes: 0, persons: new Set() };
      }

      acc[key].qty += qty;
      acc[key].minutes += minutes;

      if (item?.person) {
        const personLabel = item?.department ? `${item.person} (${item.department})` : item.person;
        acc[key].persons.add(personLabel);
      }
    });

    return acc;
  }, {});

  const entries = Object.values(breakdownMap).sort((a, b) => b.qty - a.qty);

  if (!entries.length) return null;

  return (
    <div className={`mt-4 border px-4 py-3 ${t.softBg} ${t.border}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-[11px] uppercase tracking-[0.16em] font-bold ${t.muted}`}>
          Loss Time Breakdown
        </p>
        <span className={`border px-2 py-1 text-xs font-semibold ${t.badge}`}>
          Top {entries[0]?.reason} -
        </span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {entries.map((item) => (
          <div key={item.reason} className={`border px-3 py-3 ${t.panelBg} ${t.border}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-sm font-semibold ${t.title}`}>{item.reason}</p>
                {item.persons.size ? (
                  <p className={`mt-2 text-xs leading-5 ${t.muted}`}>
                    {Array.from(item.persons).join(", ")}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <span className={`border px-2 py-1 text-xs font-bold ${t.badge}`}>
                  Qty {formatNumber(item.qty)}
                </span>
                <span className={`border px-2 py-1 text-xs font-bold ${t.badge}`}>
                  Min {formatNumber(item.minutes)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MachineMeta({ machine, theme = "light" }) {
  const t = getThemeTokens(theme);

  const latestEntry = [...machine.data].sort((a, b) => {
    const bValue = new Date(b.createdAt || b.date || 0).getTime();
    const aValue = new Date(a.createdAt || a.date || 0).getTime();
    return bValue - aValue;
  })[0];

  const bestHour = [...machine.data].sort((a, b) => toNumber(b.actual) - toNumber(a.actual))[0];
  const worstRejectHour = [...machine.data].sort((a, b) => toNumber(b.reject) - toNumber(a.reject))[0];

  return (
    <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <div className={`border px-3 py-3 ${t.softBg} ${t.border}`}>
        <p className={`text-[10px] uppercase tracking-[0.16em] font-bold ${t.muted}`}>Machine</p>
        <p className={`mt-1 text-sm font-semibold ${t.title}`}>{machine.machine || "-"}</p>
        <p className={`mt-1 text-xs ${t.muted}`}>
          Code {machine.machineCode || "-"} · Name {machine.machineName || "-"}
        </p>
      </div>

      <div className={`border px-3 py-3 ${t.softBg} ${t.border}`}>
        <p className={`text-[10px] uppercase tracking-[0.16em] font-bold ${t.muted}`}>Operator</p>
        <p className={`mt-1 text-sm font-semibold ${t.title}`}>{machine.operator || "-"}</p>
        <p className={`mt-1 text-xs ${t.muted}`}>ID {machine.operatorId || "-"}</p>
      </div>

      <div className={`border px-3 py-3 ${t.softBg} ${t.border}`}>
        <p className={`text-[10px] uppercase tracking-[0.16em] font-bold ${t.muted}`}>
          Production Context
        </p>
        <p className={`mt-1 text-sm font-semibold ${t.title}`}>
          {machine.hall || "-"} · {machine.shift || "-"}
        </p>
        <p className={`mt-1 text-xs ${t.muted}`}>Part {machine.part || "-"}</p>
      </div>

      <div className={`border px-3 py-3 ${t.softBg} ${t.border}`}>
        <p className={`text-[10px] uppercase tracking-[0.16em] font-bold ${t.muted}`}>Best Hour</p>
        <p className={`mt-1 text-sm font-semibold ${t.title}`}>{bestHour?.hour || "-"}</p>
        <p className={`mt-1 text-xs ${t.muted}`}>
          Actual {formatNumber(bestHour?.actual || 0)}
        </p>
      </div>

      <div className={`border px-3 py-3 ${t.softBg} ${t.border}`}>
        <p className={`text-[10px] uppercase tracking-[0.16em] font-bold ${t.muted}`}>
          Latest / Highest Reject
        </p>
        <p className={`mt-1 text-sm font-semibold ${t.title}`}>
          {latestEntry?.hour || worstRejectHour?.hour || "-"}
        </p>
        <p className={`mt-1 text-xs ${t.muted}`}>
          Date {formatDateTime(latestEntry?.createdAt || latestEntry?.date)}
        </p>
      </div>
    </div>
  );
}

export default function MachineHourlyChart({ machineHourlyTrend, theme = "light" }) {
  const t = getThemeTokens(theme);

  const [filters, setFilters] = useState({
    hall: "",
    shift: "",
    machine: "",
    search: "",
    fromDate: "",
    toDate: "",
    sortBy: "machine",
    chartMode: "mixed",
    density: "comfortable",
  });

  const normalizedMachines = useMemo(
    () => normalizeMachineHourlyTrendShape(machineHourlyTrend),
    [machineHourlyTrend]
  );

  const hallOptions = useMemo(
    () => [...new Set(normalizedMachines.map((item) => item.hall).filter(Boolean))].sort(),
    [normalizedMachines]
  );

  const shiftOptions = useMemo(
    () => [...new Set(normalizedMachines.map((item) => item.shift).filter(Boolean))].sort(),
    [normalizedMachines]
  );

  const machineOptions = useMemo(
    () => [...new Set(normalizedMachines.map((item) => item.machine).filter(Boolean))].sort(),
    [normalizedMachines]
  );

  const filteredMachines = useMemo(() => {
    const searchText = filters.search.trim().toLowerCase();

    const list = normalizedMachines
      .map((item) => {
        const filteredRows = item.data.filter((row) => isRowInDateRange(row, filters.fromDate, filters.toDate));
        return { ...item, data: filteredRows };
      })
      .filter((item) => item.data.length > 0)
      .filter((item) => {
        const matchesHall = !filters.hall || item.hall === filters.hall;
        const matchesShift = !filters.shift || item.shift === filters.shift;
        const matchesMachine = !filters.machine || item.machine === filters.machine;

        const haystack = [
          item.machine,
          item.machineCode,
          item.machineName,
          item.hall,
          item.shift,
          item.operator,
          item.operatorId,
          item.part,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = !searchText || haystack.includes(searchText);

        return matchesHall && matchesShift && matchesMachine && matchesSearch;
      });

    const getTotals = (machine) =>
      machine.data.reduce(
        (acc, row) => {
          acc.actual += toNumber(row.actual);
          acc.reject += toNumber(row.reject);
          acc.lossTime += toNumber(row.lossTime);
          acc.lossMinutes += toNumber(row.lossMinutes);
          return acc;
        },
        { actual: 0, reject: 0, lossTime: 0, lossMinutes: 0 }
      );

    list.sort((a, b) => {
      if (filters.sortBy === "actualDesc") return getTotals(b).actual - getTotals(a).actual;
      if (filters.sortBy === "rejectDesc") return getTotals(b).reject - getTotals(a).reject;
      if (filters.sortBy === "lossTimeDesc") return getTotals(b).lossTime - getTotals(a).lossTime;
      if (filters.sortBy === "lossMinutesDesc") return getTotals(b).lossMinutes - getTotals(a).lossMinutes;
      if (filters.sortBy === "hoursDesc") return b.data.length - a.data.length;
      return String(a.machine).localeCompare(String(b.machine));
    });

    return list;
  }, [normalizedMachines, filters]);

  if (!normalizedMachines?.length) {
    return (
      <section className={`border p-5 ${t.sectionBg} ${t.border}`}>
        <h3 className={`text-lg font-bold ${t.title}`}>Machine Wise Hourly Graph</h3>
        <p className={`mt-1 text-sm ${t.muted}`}>
          Selected filters ke hisab se koi machine hourly data available nahi hai.
        </p>
      </section>
    );
  }

  return (
    <section className={`border p-4 md:p-5 ${t.sectionBg} ${t.border}`}>
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.2em] font-bold" style={{ color: t.actual }}>
          Hourly Analysis
        </p>
        <h3 className={`mt-2 text-lg md:text-xl font-bold ${t.title}`}>
          Machine Wise Hourly Graph
        </h3>
        <p className={`mt-2 text-sm ${t.muted}`}>
          Actual, good, reject, target, loss qty aur loss minutes ko machine-wise compare karo with detailed breakdown.
        </p>
      </div>

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        hallOptions={hallOptions}
        shiftOptions={shiftOptions}
        machineOptions={machineOptions}
        resultCount={filteredMachines.length}
        theme={theme}
      />

      <div
        className="border p-3 chart-scroll-area"
        style={{
          maxHeight: "calc(100vh - 220px)",
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "thin",
          scrollbarColor: `${t.scrollbarThumb} ${t.scrollbarTrack}`,
        }}
      >
        <style>{`
          .chart-scroll-area::-webkit-scrollbar { width: 8px; }
          .chart-scroll-area::-webkit-scrollbar-track { background: ${t.scrollbarTrack}; }
          .chart-scroll-area::-webkit-scrollbar-thumb { background: ${t.scrollbarThumb}; }
        `}</style>

        {filteredMachines.length === 0 ? (
          <div className={`border p-8 text-center ${t.softBg} ${t.border}`}>
            <h4 className={`text-base font-bold ${t.title}`}>No matching records</h4>
            <p className={`mt-2 text-sm ${t.muted}`}>
              Current filters ke hisaab se koi machine data match nahi hua.
            </p>
          </div>
        ) : (
          <div className={filters.density === "compact" ? "space-y-3" : "space-y-5"}>
            {filteredMachines.map((machineItem) => {
              const chartHeight =
                filters.density === "compact"
                  ? "h-[250px] sm:h-[280px] lg:h-[300px]"
                  : "h-[280px] sm:h-[320px] lg:h-[380px]";

              return (
                <article
                  key={`${machineItem.hall}-${machineItem.machine}-${machineItem.operatorId}-${machineItem.part}`}
                  className={`border p-4 ${t.cardBg} ${t.border}`}
                >
                  <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className={`text-base md:text-lg font-bold ${t.title}`}>
                          {machineItem.machine}
                        </h4>
                        <span className={`border px-3 py-1 text-xs font-semibold ${t.badge}`}>
                          {machineItem.hall}
                        </span>
                        {machineItem.machineCode ? (
                          <span className={`border px-3 py-1 text-xs font-semibold ${t.chip}`}>
                            Code {machineItem.machineCode}
                          </span>
                        ) : null}
                      </div>

                      <div className={`mt-2 flex flex-wrap gap-2 text-xs ${t.muted}`}>
                        <span className={`border px-3 py-1 ${t.chip}`}>{machineItem.shift} Shift</span>
                        <span className={`border px-3 py-1 ${t.chip}`}>
                          Operator {machineItem.operator || "-"}
                        </span>
                        <span className={`border px-3 py-1 ${t.chip}`}>
                          Operator ID {machineItem.operatorId || "-"}
                        </span>
                        <span className={`border px-3 py-1 ${t.chip}`}>
                          Part {machineItem.part || "-"}
                        </span>
                        {machineItem.data[0]?.createdAt || machineItem.data[0]?.date ? (
                          <span className={`border px-3 py-1 ${t.chip}`}>
                            From {toDateInputValue(machineItem.data[0]?.createdAt || machineItem.data[0]?.date)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className={`border px-4 py-3 ${t.softBg} ${t.border}`}>
                        <p className={`text-[11px] uppercase tracking-[0.14em] ${t.muted}`}>Logged Hours</p>
                        <p className={`mt-1 text-base font-bold ${t.title}`}>{machineItem.data.length}</p>
                      </div>

                      <div className={`border px-4 py-3 ${t.softBg} ${t.border}`}>
                        <p className={`text-[11px] uppercase tracking-[0.14em] ${t.muted}`}>Mode</p>
                        <p className={`mt-1 text-base font-bold ${t.title}`}>{filters.chartMode}</p>
                      </div>

                      <div className={`border px-4 py-3 ${t.softBg} ${t.border}`}>
                        <p className={`text-[11px] uppercase tracking-[0.14em] ${t.muted}`}>View</p>
                        <p className={`mt-1 text-base font-bold ${t.title}`}>{filters.density}</p>
                      </div>

                      <div className={`border px-4 py-3 ${t.softBg} ${t.border}`}>
                        <p className={`text-[11px] uppercase tracking-[0.14em] ${t.muted}`}>Points</p>
                        <p className={`mt-1 text-base font-bold ${t.title}`}>{machineItem.data.length}</p>
                      </div>
                    </div>
                  </div>

                  <MachineMeta machine={machineItem} theme={theme} />
                  <MachineSummary machine={machineItem} theme={theme} />

                  <div className={`border p-3 ${t.softBg} ${t.border}`}>
                    <div className={chartHeight}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={machineItem.data}
                          margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="2 2" stroke={t.grid} />

                          <XAxis
                            dataKey="hour"
                            stroke={t.axis}
                            tick={{ fill: t.axis, fontSize: 11 }}
                            axisLine={{ stroke: t.grid }}
                            tickLine={{ stroke: t.grid }}
                            interval={0}
                            angle={machineItem.data.length > 8 ? -20 : 0}
                            textAnchor={machineItem.data.length > 8 ? "end" : "middle"}
                            height={machineItem.data.length > 8 ? 50 : 30}
                          />

                          <YAxis
                            stroke={t.axis}
                            tick={{ fill: t.axis, fontSize: 11 }}
                            axisLine={{ stroke: t.grid }}
                            tickLine={{ stroke: t.grid }}
                            allowDecimals={false}
                          />

                          <Tooltip content={<CustomTooltip theme={theme} />} />
                          <Legend wrapperStyle={{ fontSize: "12px" }} />

                          {(filters.chartMode === "mixed" || filters.chartMode === "bars") && (
                            <Bar dataKey="actual" name="Actual" radius={[2, 2, 0, 0]} barSize={16}>
                              {machineItem.data.map((entry, index) => (
                                <Cell
                                  key={`actual-cell-${index}`}
                                  fill={getPerformanceColor(entry.actual, entry.target, theme)}
                                />
                              ))}
                            </Bar>
                          )}

                          {(filters.chartMode === "mixed" || filters.chartMode === "bars") && (
                            <Bar
                              dataKey="good"
                              name="Good"
                              radius={[2, 2, 0, 0]}
                              barSize={12}
                              fill={t.good}
                            />
                          )}

                          {(filters.chartMode === "mixed" || filters.chartMode === "lines") && (
                            <Line
                              type="monotone"
                              dataKey="reject"
                              name="Reject"
                              stroke={t.reject}
                              strokeWidth={2}
                              dot={{ r: 2.5, strokeWidth: 0, fill: t.reject }}
                              activeDot={{ r: 4 }}
                            />
                          )}

                          {(filters.chartMode === "mixed" || filters.chartMode === "lines") && (
                            <Line
                              type="monotone"
                              dataKey="target"
                              name="Target"
                              stroke={t.target}
                              strokeWidth={2}
                              strokeDasharray="4 4"
                              dot={false}
                            />
                          )}

                          {(filters.chartMode === "mixed" || filters.chartMode === "lines") && (
                            <Line
                              type="monotone"
                              dataKey="lossTime"
                              name="Loss Qty"
                              stroke={t.lossQty}
                              strokeWidth={2}
                              dot={{ r: 2, strokeWidth: 0, fill: t.lossQty }}
                            />
                          )}

                          {(filters.chartMode === "mixed" || filters.chartMode === "lines") && (
                            <Area
                              type="monotone"
                              dataKey="lossMinutes"
                              name="Loss Min"
                              stroke={t.lossMinutes}
                              fill={t.lossMinutes}
                              fillOpacity={0.08}
                              strokeWidth={2}
                            />
                          )}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <RejectionReasonsBlock machine={machineItem} theme={theme} />
                  <LossTimeBlock machine={machineItem} theme={theme} />
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}