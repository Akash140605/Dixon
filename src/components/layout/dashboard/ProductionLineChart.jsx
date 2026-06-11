import React from "react";
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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload || {};

  return (
    <div className="min-w-[220px] border border-slate-300 bg-white px-3 py-3 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Production Date
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900">{label}</p>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Production</span>
          <span className="font-bold tabular-nums text-sky-700">
            {formatNumber(row.production)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Rejection</span>
          <span className="font-bold tabular-nums text-rose-700">
            {formatNumber(row.rejection)}
          </span>
        </div>
      </div>
    </div>
  );
}

function CustomLegend({ payload }) {
  if (!payload || !payload.length) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {payload.map((entry, index) => (
        <div
          key={`legend-${index}`}
          className="flex items-center gap-2 border border-slate-300 bg-slate-50 px-3 py-2"
        >
          <span
            className="h-2.5 w-2.5 shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs font-semibold text-slate-700">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ProductionLineChart({ data = [] }) {
  const chartData = Array.isArray(data) ? data : [];

  return (
    <section className="border border-slate-300 bg-white p-5">
      <div className="mb-4 border-b border-slate-200 pb-3">
        <h3 className="text-lg font-bold tracking-tight text-slate-900">
          Day Wise Production Trend
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Daily production and rejection trend overview.
        </p>
      </div>

      {chartData.length > 0 ? (
        <>
          <div className="h-[320px] w-full border border-slate-200 bg-white p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="2 2"
                  stroke="rgba(148,163,184,0.20)"
                />

                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={{ stroke: "#cbd5e1" }}
                />

                <YAxis
                  stroke="#64748b"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={{ stroke: "#cbd5e1" }}
                />

                <Tooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} />

                <Line
                  type="monotone"
                  dataKey="production"
                  name="Production"
                  stroke="#0369a1"
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 0, fill: "#0369a1" }}
                  activeDot={{ r: 5 }}
                />

                <Line
                  type="monotone"
                  dataKey="rejection"
                  name="Rejection"
                  stroke="#be123c"
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 0, fill: "#be123c" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-700 leading-7">
              <span className="font-bold">Chart reading:</span> blue line daily
              production trend ko show karti hai, aur red line rejection trend ko.
              Dono lines ka movement compare karke output consistency aur quality
              variation easily dekha ja sakta hai.
            </p>
          </div>
        </>
      ) : (
        <div className="flex h-[320px] items-center justify-center border border-dashed border-slate-300 bg-slate-50">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">
              No production trend data available
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Data add hone par line chart yahan show hoga.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}