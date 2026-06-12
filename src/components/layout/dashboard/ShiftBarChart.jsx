import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
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
      actual: "#22c55e",
      good: "#38bdf8",
      reject: "#f59e0b",
      target: "#f43f5e",
      lossTime: "#a78bfa",
      legend: "border-slate-700 bg-slate-900 text-slate-300",
      stat: "border-slate-800 bg-slate-900",
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
    actual: "#15803d",
    good: "#0369a1",
    reject: "#d97706",
    target: "#be123c",
    lossTime: "#7c3aed",
    legend: "border-slate-300 bg-slate-50 text-slate-700",
    stat: "border-slate-200 bg-slate-50",
  };
}

function normalizeChartRow(row = {}) {
  return {
    ...row,
    shift: row.shift || row.label || "-",
    actual: Number(row.actual ?? 0),
    good: Number(row.good ?? 0),
    reject: Number(row.reject ?? row.rejection ?? 0),
    target: Number(row.target ?? 0),
    lossTime: Number(row.lossTime ?? 0),
  };
}

function StatCard({ label, value, color, theme = "light" }) {
  const t = getThemeTokens(theme);

  return (
    <div className={`border px-3 py-3 ${t.stat}`}>
      <p className={`text-[10px] uppercase tracking-[0.16em] font-bold ${t.muted}`}>
        {label}
      </p>
      <p className="mt-1 text-base font-bold tabular-nums" style={{ color }}>
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
      className="min-w-[220px] border px-3 py-3 shadow-sm"
      style={{
        background: t.tooltipBg,
        borderColor: theme === "dark" ? "#334155" : "#cbd5e1",
      }}
    >
      <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${t.muted}`}>
        Shift
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

function CustomLegend({ theme = "light" }) {
  const t = getThemeTokens(theme);

  const items = [
    { label: "Actual", color: t.actual },
    { label: "Good", color: t.good },
    { label: "Reject", color: t.reject },
  ];

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex items-center gap-2 border px-2.5 py-1.5 ${t.legend}`}
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: item.color }} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ShiftBarChart({ data = [], theme = "light" }) {
  const t = getThemeTokens(theme);

  const chartData = useMemo(
    () => (Array.isArray(data) ? data.map(normalizeChartRow) : []),
    [data]
  );

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
    <section className={`border p-4 ${t.sectionBg} ${t.border}`}>
      <div className="mb-4 border-b pb-3 border-inherit">
        <h3 className={`text-base font-bold tracking-tight ${t.title}`}>
          Shift Wise Production
        </h3>
        <p className={`mt-1 text-xs ${t.muted}`}>
          Actual, good, reject, target aur loss time by shift.
        </p>
      </div>

      {chartData.length > 0 ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-6">
            <StatCard label="Actual" value={totals.actual} color={t.actual} theme={theme} />
            <StatCard label="Good" value={totals.good} color={t.good} theme={theme} />
            <StatCard label="Reject" value={totals.reject} color={t.reject} theme={theme} />
            <StatCard label="Target" value={totals.target} color={t.target} theme={theme} />
            <StatCard label="Loss Time" value={totals.lossTime} color={t.lossTime} theme={theme} />
            <StatCard label="Reject %" value={rejectPercent} color={t.reject} theme={theme} />
          </div>

          <CustomLegend theme={theme} />

          <div className={`h-[280px] w-full border p-2 ${t.panelBg} ${t.border}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                barCategoryGap={18}
              >
                <CartesianGrid
                  strokeDasharray="2 2"
                  stroke={t.grid}
                />

                <XAxis
                  dataKey="shift"
                  stroke={t.axis}
                  tick={{ fill: t.axis, fontSize: 11 }}
                  axisLine={{ stroke: t.grid }}
                  tickLine={{ stroke: t.grid }}
                />

                <YAxis
                  stroke={t.axis}
                  tick={{ fill: t.axis, fontSize: 11 }}
                  axisLine={{ stroke: t.grid }}
                  tickLine={{ stroke: t.grid }}
                />

                <Tooltip content={<CustomTooltip theme={theme} />} />
                <Legend wrapperStyle={{ display: "none" }} />

                <Bar
                  dataKey="actual"
                  name="Actual"
                  fill={t.actual}
                  radius={[2, 2, 0, 0]}
                  barSize={16}
                />

                <Bar
                  dataKey="good"
                  name="Good"
                  fill={t.good}
                  radius={[2, 2, 0, 0]}
                  barSize={16}
                />

                <Bar
                  dataKey="reject"
                  name="Reject"
                  fill={t.reject}
                  radius={[2, 2, 0, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={`mt-4 border px-4 py-3 ${t.softBg} ${t.border}`}>
            <p className={`text-sm leading-7 ${t.text}`}>
              <span className="font-bold">Chart reading:</span> actual, good aur reject bars ko compare karke har shift ki output quality aur efficiency jaldi samajh aati hai. Target aur loss time tooltip me available rehne se shift performance context aur clear ho jata hai.
            </p>
          </div>
        </>
      ) : (
        <div className={`flex h-[240px] items-center justify-center border border-dashed ${t.border} ${t.softBg}`}>
          <div className="text-center">
            <p className={`text-sm font-semibold ${t.title}`}>
              No shift data available
            </p>
            <p className={`mt-1 text-xs ${t.muted}`}>
              Shift-wise chart yahan show hoga.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}