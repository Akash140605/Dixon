import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

const COLORS = [
  "#991b1b", // deep red
  "#b45309", // amber-brown
  "#475569", // slate
  "#1d4ed8", // blue
  "#15803d", // green
  "#7c3aed", // violet
];

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0];

  return (
    <div className="min-w-[200px] border border-slate-300 bg-white px-3 py-2 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Reject Reason
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900">{item.name}</p>
      <div className="mt-2 flex items-center justify-between gap-4 text-sm">
        <span className="text-slate-500">Quantity</span>
        <span className="font-bold tabular-nums text-slate-900">
          {formatNumber(item.value)}
        </span>
      </div>
    </div>
  );
}

function CompactLegend({ data = [] }) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-2">
      {data.map((item, index) => (
        <div
          key={`${item.reason}-${index}`}
          className="flex items-center justify-between gap-3 border border-slate-300 bg-slate-50 px-3 py-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-2.5 w-2.5 shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="truncate text-xs font-semibold text-slate-700">
              {item.reason}
            </span>
          </div>

          <span className="text-xs font-bold tabular-nums text-slate-900">
            {formatNumber(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function renderLabel({ percent }) {
  if (!percent || percent < 0.08) return "";
  return `${(percent * 100).toFixed(0)}%`;
}

export default function RejectionPieChart({ data = [] }) {
  const chartData = Array.isArray(data)
    ? data.filter((item) => Number(item?.value || 0) > 0)
    : [];

  return (
    <section className="border border-slate-300 bg-white p-4">
      <div className="mb-3 border-b border-slate-200 pb-3">
        <h3 className="text-base font-bold tracking-tight text-slate-900">
          Rejection Breakdown
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Reason-wise rejection distribution.
        </p>
      </div>

      {chartData.length > 0 ? (
        <>
          <div className="h-[240px] w-full border border-slate-200 bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="reason"
                  cx="50%"
                  cy="50%"
                  outerRadius={74}
                  innerRadius={0}
                  paddingAngle={1}
                  stroke="#ffffff"
                  strokeWidth={1}
                  labelLine={false}
                  label={renderLabel}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.reason || index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <CompactLegend data={chartData} />
        </>
      ) : (
        <div className="flex h-[240px] items-center justify-center border border-dashed border-slate-300 bg-slate-50">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">
              No rejection data available
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Rejection breakdown yahan show hoga.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}