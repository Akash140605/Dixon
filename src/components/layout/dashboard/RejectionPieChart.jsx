import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
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
      tooltipBg: "rgba(2, 6, 23, 0.98)",
      legend: "border-slate-700 bg-slate-900 text-slate-300",
      center: "text-slate-100",
      subCenter: "text-slate-500",
      palette: ["#ef4444", "#f59e0b", "#38bdf8", "#22c55e", "#a78bfa", "#f97316", "#14b8a6", "#e879f9"],
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
    tooltipBg: "rgba(255,255,255,0.98)",
    legend: "border-slate-300 bg-slate-50 text-slate-700",
    center: "text-slate-900",
    subCenter: "text-slate-500",
    palette: ["#991b1b", "#b45309", "#475569", "#1d4ed8", "#15803d", "#7c3aed", "#ea580c", "#0f766e"],
  };
}

function normalizeChartRow(item = {}) {
  return {
    reason: item.reason || item.name || "Other",
    value: Number(item.value ?? item.qty ?? 0),
  };
}

function CustomTooltip({ active, payload, theme = "light" }) {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0];
  const t = getThemeTokens(theme);
  const percent = Number(item?.payload?.percent || 0);

  return (
    <div
      className="min-w-[220px] border px-3 py-3 shadow-sm"
      style={{
        background: t.tooltipBg,
        borderColor: theme === "dark" ? "#334155" : "#cbd5e1",
      }}
    >
      <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${t.muted}`}>
        Reject Reason
      </p>
      <p className={`mt-1 text-sm font-bold ${t.title}`}>{item.name}</p>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className={t.muted}>Quantity</span>
          <span className={`font-bold tabular-nums ${t.title}`}>
            {formatNumber(item.value)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className={t.muted}>Share</span>
          <span className={`font-bold tabular-nums ${t.title}`}>
            {(percent * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function CompactLegend({ data = [], total = 0, theme = "light" }) {
  const t = getThemeTokens(theme);

  return (
    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {data.map((item, index) => {
        const percent = total > 0 ? (item.value / total) * 100 : 0;

        return (
          <div
            key={`${item.reason}-${index}`}
            className={`flex items-center justify-between gap-3 border px-3 py-2 ${t.legend}`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: t.palette[index % t.palette.length] }}
              />
              <span className="truncate text-xs font-semibold">
                {item.reason}
              </span>
            </div>

            <div className="text-right">
              <p className="text-xs font-bold tabular-nums">
                {formatNumber(item.value)}
              </p>
              <p className={`text-[10px] ${t.muted}`}>
                {percent.toFixed(1)}%
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CenterLabel({ total, theme = "light" }) {
  const t = getThemeTokens(theme);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${t.subCenter}`}>
          Total Reject
        </p>
        <p className={`mt-1 text-2xl font-bold tabular-nums ${t.center}`}>
          {formatNumber(total)}
        </p>
      </div>
    </div>
  );
}

function renderLabel({ percent }) {
  if (!percent || percent < 0.08) return "";
  return `${(percent * 100).toFixed(0)}%`;
}

export default function RejectionPieChart({ data = [], theme = "light" }) {
  const t = getThemeTokens(theme);

  const chartData = useMemo(() => {
    const cleaned = Array.isArray(data)
      ? data.map(normalizeChartRow).filter((item) => item.value > 0)
      : [];

    const total = cleaned.reduce((sum, item) => sum + item.value, 0);

    return cleaned
      .sort((a, b) => b.value - a.value)
      .map((item) => ({
        ...item,
        percent: total > 0 ? item.value / total : 0,
      }));
  }, [data]);

  const totalReject = useMemo(
    () => chartData.reduce((sum, item) => sum + item.value, 0),
    [chartData]
  );

  const topReason = chartData[0]?.reason || "-";

  return (
    <section className={`border p-4 ${t.sectionBg} ${t.border}`}>
      <div className="mb-4 border-b pb-3 border-inherit">
        <h3 className={`text-base font-bold tracking-tight ${t.title}`}>
          Rejection Breakdown
        </h3>
        <p className={`mt-1 text-xs ${t.muted}`}>
          Reason-wise rejection distribution overview.
        </p>
      </div>

      {chartData.length > 0 ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <div className={`border px-3 py-3 ${t.softBg} ${t.border}`}>
              <p className={`text-[10px] uppercase tracking-[0.16em] font-bold ${t.muted}`}>
                Total Reject
              </p>
              <p className={`mt-1 text-lg font-bold tabular-nums ${t.title}`}>
                {formatNumber(totalReject)}
              </p>
            </div>

            <div className={`border px-3 py-3 ${t.softBg} ${t.border}`}>
              <p className={`text-[10px] uppercase tracking-[0.16em] font-bold ${t.muted}`}>
                Top Reason
              </p>
              <p className={`mt-1 text-sm font-bold ${t.title}`}>
                {topReason}
              </p>
            </div>

            <div className={`border px-3 py-3 ${t.softBg} ${t.border}`}>
              <p className={`text-[10px] uppercase tracking-[0.16em] font-bold ${t.muted}`}>
                Reason Count
              </p>
              <p className={`mt-1 text-lg font-bold tabular-nums ${t.title}`}>
                {chartData.length}
              </p>
            </div>
          </div>

          <div className={`border p-3 ${t.panelBg} ${t.border}`}>
            <div className="relative h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="reason"
                    cx="50%"
                    cy="50%"
                    outerRadius={88}
                    innerRadius={52}
                    paddingAngle={2}
                    stroke={theme === "dark" ? "#020617" : "#ffffff"}
                    strokeWidth={2}
                    labelLine={false}
                    label={renderLabel}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.reason || index}`}
                        fill={t.palette[index % t.palette.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip content={<CustomTooltip theme={theme} />} />
                </PieChart>
              </ResponsiveContainer>

              <CenterLabel total={totalReject} theme={theme} />
            </div>
          </div>

          <CompactLegend data={chartData} total={totalReject} theme={theme} />

          <div className={`mt-4 border px-4 py-3 ${t.softBg} ${t.border}`}>
            <p className={`text-sm leading-7 ${t.text}`}>
              <span className="font-bold">Chart reading:</span> jo segment sabse bada hai, wahi rejection ka dominant reason hai. Isse quickly samajh aata hai ki quality issue isolated hai ya multiple reasons me spread hai.
            </p>
          </div>
        </>
      ) : (
        <div className={`flex h-[240px] items-center justify-center border border-dashed ${t.border} ${t.softBg}`}>
          <div className="text-center">
            <p className={`text-sm font-semibold ${t.title}`}>
              No rejection data available
            </p>
            <p className={`mt-1 text-xs ${t.muted}`}>
              Rejection breakdown yahan show hoga.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}