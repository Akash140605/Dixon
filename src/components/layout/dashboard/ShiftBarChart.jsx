import React from "react";
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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload || {};

  return (
    <div className="min-w-[200px] border border-slate-300 bg-white px-3 py-2 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Shift
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900">{label}</p>

      <div className="mt-2 space-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Actual</span>
          <span className="font-bold tabular-nums text-emerald-700">
            {formatNumber(row.actual)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Rejection</span>
          <span className="font-bold tabular-nums text-amber-700">
            {formatNumber(row.rejection)}
          </span>
        </div>
      </div>
    </div>
  );
}

function MiniLegend() {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      <div className="flex items-center gap-2 border border-slate-300 bg-slate-50 px-2.5 py-1.5">
        <span className="h-2.5 w-2.5 bg-emerald-700" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
          Actual
        </span>
      </div>

      <div className="flex items-center gap-2 border border-slate-300 bg-slate-50 px-2.5 py-1.5">
        <span className="h-2.5 w-2.5 bg-amber-600" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
          Rejection
        </span>
      </div>
    </div>
  );
}

export default function ShiftBarChart({ data = [] }) {
  const chartData = Array.isArray(data) ? data : [];

  return (
    <section className="border border-slate-300 bg-white p-4">
      <div className="mb-3 border-b border-slate-200 pb-3">
        <h3 className="text-base font-bold tracking-tight text-slate-900">
          Shift Wise Production
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Actual vs rejection by shift.
        </p>
      </div>

      {chartData.length > 0 ? (
        <>
          <MiniLegend />

          <div className="h-[240px] w-full border border-slate-200 bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                barCategoryGap={18}
              >
                <CartesianGrid
                  strokeDasharray="2 2"
                  stroke="rgba(148,163,184,0.20)"
                />

                <XAxis
                  dataKey="shift"
                  stroke="#64748b"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={{ stroke: "#cbd5e1" }}
                />

                <YAxis
                  stroke="#64748b"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={{ stroke: "#cbd5e1" }}
                />

                <Tooltip content={<CustomTooltip />} />

                <Bar
                  dataKey="actual"
                  fill="#15803d"
                  radius={[0, 0, 0, 0]}
                  barSize={18}
                />

                <Bar
                  dataKey="rejection"
                  fill="#d97706"
                  radius={[0, 0, 0, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="flex h-[240px] items-center justify-center border border-dashed border-slate-300 bg-slate-50">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">
              No shift data available
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Shift-wise chart yahan show hoga.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}