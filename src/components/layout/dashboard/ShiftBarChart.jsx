import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function normalizeChartRow(row = {}) {
  return {
    shift: row.shift || row.label || "-",
    actual: Number(row.actual ?? 0),
    good: Number(row.good ?? 0),
    reject: Number(row.reject ?? row.rejection ?? 0),
    target: Number(row.target ?? 0),
  };
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold tabular-nums" style={{ color: accent }}>
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload || {};

  return (
    <div className="min-w-[200px] rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-lg">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Shift
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{label}</p>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Actual</span>
          <span className="font-semibold tabular-nums text-emerald-700">
            {formatNumber(row.actual)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Good</span>
          <span className="font-semibold tabular-nums text-sky-700">
            {formatNumber(row.good)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Reject</span>
          <span className="font-semibold tabular-nums text-amber-700">
            {formatNumber(row.reject)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-2">
          <span className="text-slate-500">Target</span>
          <span className="font-semibold tabular-nums text-rose-700">
            {formatNumber(row.target)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ShiftBarChart({ data = [] }) {
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
        return acc;
      },
      { actual: 0, good: 0, reject: 0 }
    );
  }, [chartData]);

  const rejectPercent =
    totals.actual > 0 ? `${((totals.reject / totals.actual) * 100).toFixed(1)}%` : "0.0%";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] md:p-5">
      <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-slate-950">
            Shift Production Overview
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Compare actual output, good quantity and rejection across shifts.
          </p>
        </div>

        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
          {chartData.length} shifts
        </div>
      </div>

      {chartData.length > 0 ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label="Actual" value={totals.actual} accent="#15803d" />
            <StatCard label="Good" value={totals.good} accent="#0369a1" />
            <StatCard label="Reject" value={totals.reject} accent="#d97706" />
            <StatCard label="Reject %" value={rejectPercent} accent="#b45309" />
          </div>

          <div className="h-[300px] w-full rounded-xl border border-slate-200 bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                barCategoryGap={20}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.18)"
                />

                <XAxis
                  dataKey="shift"
                  stroke="#64748b"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  stroke="#64748b"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />

                <Bar
                  dataKey="actual"
                  name="Actual"
                  fill="#15803d"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />

                <Bar
                  dataKey="good"
                  name="Good"
                  fill="#0369a1"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />

                <Bar
                  dataKey="reject"
                  name="Reject"
                  fill="#d97706"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="flex h-[240px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-900">No shift data available</p>
            <p className="mt-1 text-xs text-slate-500">
              Shift-wise production chart will appear here.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}