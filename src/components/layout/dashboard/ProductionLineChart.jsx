import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function formatShortDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function formatMonthLabel(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

function getWeekLabel(startDate, endDate) {
  return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
}

function getThemeTokens(theme = "light") {
  if (theme === "dark") {
    return {
      sectionBg: "bg-slate-950",
      panelBg: "bg-slate-950",
      softBg: "bg-slate-900",
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
      lossTime: "#a78bfa",
      legend: "border-slate-700 bg-slate-900 text-slate-300",
      stat: "border-slate-800 bg-slate-900",
      activeTab: "bg-slate-100 text-slate-900 border-slate-100",
      tab: "bg-slate-900 text-slate-300 border-slate-700",
    };
  }

  return {
    sectionBg: "bg-white",
    panelBg: "bg-white",
    softBg: "bg-slate-50",
    border: "border-slate-300",
    title: "text-slate-900",
    text: "text-slate-700",
    muted: "text-slate-500",
    grid: "rgba(148,163,184,0.20)",
    axis: "#64748b",
    tooltipBg: "rgba(255,255,255,0.98)",
    actual: "#0369a1",
    good: "#15803d",
    reject: "#be123c",
    target: "#b45309",
    lossTime: "#7c3aed",
    legend: "border-slate-300 bg-slate-50 text-slate-700",
    stat: "border-slate-200 bg-slate-50",
    activeTab: "bg-slate-900 text-white border-slate-900",
    tab: "bg-white text-slate-700 border-slate-300",
  };
}

function normalizeChartRow(row = {}) {
  return {
    ...row,
    date: row.date || row.label || "",
    actual: Number(row.actual ?? row.production ?? 0),
    good: Number(row.good ?? 0),
    reject: Number(row.reject ?? row.rejection ?? 0),
    target: Number(row.target ?? 0),
    lossTime: Number(row.lossTime ?? 0),
  };
}

function sortByDate(rows = []) {
  return [...rows].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return da - db;
  });
}

function aggregateChunk(rows, label) {
  return {
    label,
    date: rows[0]?.date || "",
    actual: rows.reduce((sum, row) => sum + Number(row.actual || 0), 0),
    good: rows.reduce((sum, row) => sum + Number(row.good || 0), 0),
    reject: rows.reduce((sum, row) => sum + Number(row.reject || 0), 0),
    target: rows.reduce((sum, row) => sum + Number(row.target || 0), 0),
    lossTime: rows.reduce((sum, row) => sum + Number(row.lossTime || 0), 0),
  };
}

function groupByChunkSize(rows, size) {
  const output = [];
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    const start = chunk[0]?.date;
    const end = chunk[chunk.length - 1]?.date;
    output.push(
      aggregateChunk(
        chunk,
        start === end ? formatShortDate(start) : `${formatShortDate(start)} - ${formatShortDate(end)}`
      )
    );
  }
  return output;
}

function groupWeekly(rows) {
  const buckets = [];
  for (let i = 0; i < rows.length; i += 7) {
    const chunk = rows.slice(i, i + 7);
    const start = chunk[0]?.date;
    const end = chunk[chunk.length - 1]?.date;
    buckets.push(aggregateChunk(chunk, getWeekLabel(start, end)));
  }
  return buckets;
}

function groupMonthly(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const date = new Date(row.date);
    if (Number.isNaN(date.getTime())) return;

    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(row);
  });

  return Array.from(map.values()).map((chunk) =>
    aggregateChunk(chunk, formatMonthLabel(chunk[0]?.date))
  );
}

function StatCard({ label, value, color, theme = "light" }) {
  const t = getThemeTokens(theme);

  return (
    <div className={`border px-4 py-3 ${t.stat}`}>
      <p className={`text-[10px] uppercase tracking-[0.16em] font-bold ${t.muted}`}>
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums" style={{ color }}>
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
    </div>
  );
}

function CustomTooltip({ active, payload, label, theme = "light" }) {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload || {};
  const t = getThemeTokens(theme);

  return (
    <div
      className="min-w-[240px] border px-3 py-3 shadow-sm"
      style={{
        background: t.tooltipBg,
        borderColor: theme === "dark" ? "#334155" : "#cbd5e1",
      }}
    >
      <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${t.muted}`}>
        Period
      </p>
      <p className={`mt-1 text-sm font-bold ${t.title}`}>{label}</p>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className={t.muted}>Actual</span>
          <span className="font-bold tabular-nums" style={{ color: t.actual }}>
            {formatNumber(row.actual)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className={t.muted}>Good</span>
          <span className="font-bold tabular-nums" style={{ color: t.good }}>
            {formatNumber(row.good)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className={t.muted}>Reject</span>
          <span className="font-bold tabular-nums" style={{ color: t.reject }}>
            {formatNumber(row.reject)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className={t.muted}>Target</span>
          <span className="font-bold tabular-nums" style={{ color: t.target }}>
            {formatNumber(row.target)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className={t.muted}>Loss Time</span>
          <span className="font-bold tabular-nums" style={{ color: t.lossTime }}>
            {formatNumber(row.lossTime)}
          </span>
        </div>
      </div>
    </div>
  );
}

function CustomLegend({ payload, theme = "light" }) {
  const t = getThemeTokens(theme);

  if (!payload || !payload.length) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {payload.map((entry, index) => (
        <div
          key={`legend-${index}`}
          className={`flex items-center gap-2 border px-3 py-2 ${t.legend}`}
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

const RANGE_OPTIONS = [
  { key: "daily", label: "Daily" },
  { key: "3day", label: "3 Day" },
  { key: "5day", label: "5 Day" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

export default function ProductionLineChart({
  data = [],
  theme = "light",
  title = "Day Wise Production Trend",
  ignoreFilters = true,
}) {
  const t = getThemeTokens(theme);
  const [range, setRange] = useState("daily");

  const baseData = useMemo(() => {
    const normalized = Array.isArray(data) ? data.map(normalizeChartRow) : [];
    return sortByDate(normalized);
  }, [data]);

  const chartData = useMemo(() => {
    if (range === "3day") return groupByChunkSize(baseData, 3);
    if (range === "5day") return groupByChunkSize(baseData, 5);
    if (range === "weekly") return groupWeekly(baseData);
    if (range === "monthly") return groupMonthly(baseData);
    return baseData.map((row) => ({
      ...row,
      label: formatShortDate(row.date),
    }));
  }, [baseData, range]);

  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, row) => {
        acc.actual += row.actual;
        acc.good += row.good;
        acc.reject += row.reject;
        acc.target += row.target;
        acc.lossTime += row.lossTime;
        return acc;
      },
      { actual: 0, good: 0, reject: 0, target: 0, lossTime: 0 }
    );
  }, [chartData]);

  const rejectPercent =
    totals.actual > 0 ? `${((totals.reject / totals.actual) * 100).toFixed(2)}%` : "0.00%";

  return (
    <section className={`border p-5 ${t.sectionBg} ${t.border}`}>
      <div className="mb-4 flex flex-col gap-4 border-b pb-3 border-inherit">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className={`text-lg font-bold tracking-tight ${t.title}`}>
              {title}
            </h3>
            <p className={`mt-1 text-sm ${t.text}`}>
              Daily, grouped multi-day, weekly aur monthly production trend overview.
            </p>
          </div>

          {ignoreFilters ? (
            <div className={`border px-3 py-2 text-xs font-semibold ${t.legend}`}>
              Full trend view, filter independent
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setRange(option.key)}
              className={`border px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition ${
                range === option.key ? t.activeTab : t.tab
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {chartData.length > 0 ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Actual" value={totals.actual} color={t.actual} theme={theme} />
            <StatCard label="Good" value={totals.good} color={t.good} theme={theme} />
            <StatCard label="Reject" value={totals.reject} color={t.reject} theme={theme} />
            <StatCard label="Target" value={totals.target} color={t.target} theme={theme} />
            <StatCard label="Loss Time" value={totals.lossTime} color={t.lossTime} theme={theme} />
            <StatCard label="Reject %" value={rejectPercent} color={t.reject} theme={theme} />
          </div>

          <div className={`h-[360px] w-full border p-3 ${t.panelBg} ${t.border}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="2 2" stroke={t.grid} />

                <XAxis
                  dataKey="label"
                  stroke={t.axis}
                  tick={{ fill: t.axis, fontSize: 12 }}
                  axisLine={{ stroke: t.grid }}
                  tickLine={{ stroke: t.grid }}
                  interval={0}
                  angle={chartData.length > 7 ? -20 : 0}
                  textAnchor={chartData.length > 7 ? "end" : "middle"}
                  height={chartData.length > 7 ? 52 : 30}
                />

                <YAxis
                  stroke={t.axis}
                  tick={{ fill: t.axis, fontSize: 12 }}
                  axisLine={{ stroke: t.grid }}
                  tickLine={{ stroke: t.grid }}
                />

                <Tooltip content={<CustomTooltip theme={theme} />} />
                <Legend content={<CustomLegend theme={theme} />} />

                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual"
                  stroke={t.actual}
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 0, fill: t.actual }}
                  activeDot={{ r: 5 }}
                />

                <Line
                  type="monotone"
                  dataKey="good"
                  name="Good"
                  stroke={t.good}
                  strokeWidth={2.2}
                  dot={{ r: 3, strokeWidth: 0, fill: t.good }}
                  activeDot={{ r: 5 }}
                />

                <Line
                  type="monotone"
                  dataKey="reject"
                  name="Reject"
                  stroke={t.reject}
                  strokeWidth={2.2}
                  dot={{ r: 3, strokeWidth: 0, fill: t.reject }}
                  activeDot={{ r: 5 }}
                />

                <Line
                  type="monotone"
                  dataKey="target"
                  name="Target"
                  stroke={t.target}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="lossTime"
                  name="Loss Time"
                  stroke={t.lossTime}
                  strokeWidth={2}
                  dot={{ r: 2.5, strokeWidth: 0, fill: t.lossTime }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className={`mt-4 border px-4 py-3 ${t.softBg} ${t.border}`}>
            <p className={`text-sm leading-7 ${t.text}`}>
              <span className="font-bold">Chart reading:</span> range switcher se tum daily noise aur grouped trend dono compare kar sakte ho; weekly aur monthly view long-term pattern samajhne ke liye zyada clean hota hai.
            </p>
          </div>
        </>
      ) : (
        <div className={`flex h-[320px] items-center justify-center border border-dashed ${t.border} ${t.softBg}`}>
          <div className="text-center">
            <p className={`text-sm font-semibold ${t.title}`}>
              No production trend data available
            </p>
            <p className={`mt-1 text-xs ${t.muted}`}>
              Data add hone par trend chart yahan show hoga.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}