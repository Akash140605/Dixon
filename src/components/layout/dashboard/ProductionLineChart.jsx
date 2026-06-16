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

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value) {
  return toNumber(value).toLocaleString("en-IN");
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
      input: "bg-slate-900 text-slate-200 border-slate-700",
      scrollHint: "text-slate-500",
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
    input: "bg-white text-slate-700 border-slate-300",
    scrollHint: "text-slate-500",
  };
}

function normalizeChartRow(row = {}) {
  return {
    ...row,
    date: row.date || row.label || "",
    actual: toNumber(row.actual ?? row.production ?? 0),
    good: toNumber(row.good ?? 0),
    reject: toNumber(row.reject ?? row.rejection ?? 0),
    target: toNumber(row.target ?? 0),
    lossTime: toNumber(row.lossTime ?? 0),
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
    actual: rows.reduce((sum, row) => sum + toNumber(row.actual), 0),
    good: rows.reduce((sum, row) => sum + toNumber(row.good), 0),
    reject: rows.reduce((sum, row) => sum + toNumber(row.reject), 0),
    target: rows.reduce((sum, row) => sum + toNumber(row.target), 0),
    lossTime: rows.reduce((sum, row) => sum + toNumber(row.lossTime), 0),
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
        start === end
          ? formatShortDate(start)
          : `${formatShortDate(start)} - ${formatShortDate(end)}`,
      ),
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
    aggregateChunk(chunk, formatMonthLabel(chunk[0]?.date)),
  );
}

function toInputDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isWithinDateRange(dateValue, fromDate, toDate) {
  const current = new Date(dateValue);
  if (Number.isNaN(current.getTime())) return false;

  const currentOnly = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate(),
  );

  if (fromDate) {
    const from = new Date(fromDate);
    const fromOnly = new Date(
      from.getFullYear(),
      from.getMonth(),
      from.getDate(),
    );
    if (currentOnly < fromOnly) return false;
  }

  if (toDate) {
    const to = new Date(toDate);
    const toOnly = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    if (currentOnly > toOnly) return false;
  }

  return true;
}

function getScrollableChartWidth(pointsCount, range) {
  if (range !== "daily") return "100%";
  if (pointsCount <= 7) return "100%";
  return Math.max(900, pointsCount * 88);
}

function getXAxisInterval(pointsCount, range) {
  if (range !== "daily") return 0;
  if (pointsCount > 60) return 6;
  if (pointsCount > 40) return 4;
  if (pointsCount > 25) return 2;
  if (pointsCount > 14) return 1;
  return 0;
}

function getXAxisAngle(pointsCount, range) {
  if (range !== "daily") return 0;
  if (pointsCount > 10) return -30;
  if (pointsCount > 6) return -20;
  return 0;
}

function getXAxisHeight(pointsCount, range) {
  if (range !== "daily") return 34;
  if (pointsCount > 10) return 64;
  if (pointsCount > 6) return 52;
  return 30;
}

function shouldShowDots(pointsCount, range) {
  if (range !== "daily") return true;
  return pointsCount <= 25;
}

function StatCard({ label, value, color, theme = "light" }) {
  const t = getThemeTokens(theme);

  return (
    <div className={`border px-4 py-3 ${t.stat}`}>
      <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${t.muted}`}>
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
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const baseData = useMemo(() => {
    const normalized = Array.isArray(data) ? data.map(normalizeChartRow) : [];
    return sortByDate(normalized);
  }, [data]);

  const minAvailableDate = useMemo(
    () => (baseData.length ? toInputDate(baseData[0]?.date) : ""),
    [baseData],
  );

  const maxAvailableDate = useMemo(
    () => (baseData.length ? toInputDate(baseData[baseData.length - 1]?.date) : ""),
    [baseData],
  );

  const filteredBaseData = useMemo(() => {
    return baseData.filter((row) =>
      isWithinDateRange(row.date, fromDate, toDate),
    );
  }, [baseData, fromDate, toDate]);

  const chartData = useMemo(() => {
    if (range === "3day") return groupByChunkSize(filteredBaseData, 3);
    if (range === "5day") return groupByChunkSize(filteredBaseData, 5);
    if (range === "weekly") return groupWeekly(filteredBaseData);
    if (range === "monthly") return groupMonthly(filteredBaseData);

    return filteredBaseData.map((row) => ({
      ...row,
      label: formatShortDate(row.date),
    }));
  }, [filteredBaseData, range]);

  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, row) => {
        acc.actual += toNumber(row.actual);
        acc.good += toNumber(row.good);
        acc.reject += toNumber(row.reject);
        acc.target += toNumber(row.target);
        acc.lossTime += toNumber(row.lossTime);
        return acc;
      },
      { actual: 0, good: 0, reject: 0, target: 0, lossTime: 0 },
    );
  }, [chartData]);

  const rejectPercent =
    totals.actual > 0
      ? `${((totals.reject / totals.actual) * 100).toFixed(2)}%`
      : "0.00%";

  const appliedRangeText =
    fromDate || toDate
      ? `${fromDate ? formatShortDate(fromDate) : "Start"} - ${toDate ? formatShortDate(toDate) : "End"}`
      : "All dates";

  const handleResetDateFilter = () => {
    setFromDate("");
    setToDate("");
  };

  const scrollableWidth = getScrollableChartWidth(chartData.length, range);
  const xAxisInterval = getXAxisInterval(chartData.length, range);
  const xAxisAngle = getXAxisAngle(chartData.length, range);
  const xAxisHeight = getXAxisHeight(chartData.length, range);
  const showDots = shouldShowDots(chartData.length, range);
  const needsHorizontalScroll = range === "daily" && chartData.length > 7;

  return (
    <section className={`border p-5 ${t.sectionBg} ${t.border}`}>
      <div className="mb-4 flex flex-col gap-4 border-b pb-3 border-inherit">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className={`text-lg font-bold tracking-tight ${t.title}`}>
              {title}
            </h3>
            <p className={`mt-1 text-sm ${t.text}`}>
              Daily, grouped multi-day, weekly, and monthly production trend overview.
            </p>
          </div>

          {ignoreFilters ? (
            <div className={`border px-3 py-2 text-xs font-semibold ${t.legend}`}>
              Full trend view, independent of external filters
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

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-1">
            <label className={`mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] ${t.muted}`}>
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              min={minAvailableDate || undefined}
              max={toDate || maxAvailableDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              className={`w-full border px-3 py-2 text-sm font-medium outline-none ${t.input}`}
            />
          </div>

          <div className="md:col-span-1">
            <label className={`mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] ${t.muted}`}>
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              min={fromDate || minAvailableDate || undefined}
              max={maxAvailableDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className={`w-full border px-3 py-2 text-sm font-medium outline-none ${t.input}`}
            />
          </div>

          <div className="md:col-span-1">
            <label className={`mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] ${t.muted}`}>
              Applied Range
            </label>
            <div className={`flex min-h-[42px] items-center border px-3 py-2 text-sm font-semibold ${t.legend}`}>
              {appliedRangeText}
            </div>
          </div>

          <div className="md:col-span-1">
            <label className={`mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] ${t.muted}`}>
              Reset
            </label>
            <button
              type="button"
              onClick={handleResetDateFilter}
              className={`w-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition ${t.tab}`}
            >
              Clear Date Filter
            </button>
          </div>
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

          <div className={`border p-3 ${t.panelBg} ${t.border}`}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${t.muted}`}>
                Trend Chart
              </p>
              {needsHorizontalScroll ? (
                <p className={`text-[11px] font-medium ${t.scrollHint}`}>
                  Scroll horizontally to compare longer daily ranges
                </p>
              ) : null}
            </div>

            <div className="overflow-x-auto overflow-y-hidden">
              <div
                style={{
                  width:
                    typeof scrollableWidth === "number"
                      ? `${scrollableWidth}px`
                      : scrollableWidth,
                  minWidth: "100%",
                  height: 360,
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 16, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="2 2" stroke={t.grid} />

                    <XAxis
                      dataKey="label"
                      stroke={t.axis}
                      tick={{ fill: t.axis, fontSize: 12 }}
                      axisLine={{ stroke: t.grid }}
                      tickLine={{ stroke: t.grid }}
                      interval={xAxisInterval}
                      angle={xAxisAngle}
                      textAnchor={xAxisAngle < 0 ? "end" : "middle"}
                      height={xAxisHeight}
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
                      dot={showDots ? { r: 3, strokeWidth: 0, fill: t.actual } : false}
                      activeDot={{ r: 5 }}
                    />

                    <Line
                      type="monotone"
                      dataKey="good"
                      name="Good"
                      stroke={t.good}
                      strokeWidth={2.2}
                      dot={showDots ? { r: 3, strokeWidth: 0, fill: t.good } : false}
                      activeDot={{ r: 5 }}
                    />

                    <Line
                      type="monotone"
                      dataKey="reject"
                      name="Reject"
                      stroke={t.reject}
                      strokeWidth={2.2}
                      dot={showDots ? { r: 3, strokeWidth: 0, fill: t.reject } : false}
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
                      dot={showDots ? { r: 2.5, strokeWidth: 0, fill: t.lossTime } : false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className={`mt-4 border px-4 py-3 ${t.softBg} ${t.border}`}>
            <p className={`text-sm leading-7 ${t.text}`}>
              Select a date range first, then switch between daily or grouped views to compare the same period at different time resolutions.
              Horizontal scrolling is enabled automatically for dense daily data.
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
              No data was found for the selected date range.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}