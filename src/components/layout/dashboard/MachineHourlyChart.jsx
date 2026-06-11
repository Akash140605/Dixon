import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
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
      badge: "bg-slate-900 text-slate-200 border-slate-700",
      chip: "bg-slate-900 text-slate-300 border-slate-700",
      input:
        "bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500",
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
    badge: "bg-slate-100 text-slate-700 border-slate-300",
    chip: "bg-slate-50 text-slate-700 border-slate-300",
    input:
      "bg-white border-slate-300 text-slate-800 placeholder:text-slate-400",
    scrollbarThumb: "rgba(100,116,139,0.45)",
    scrollbarTrack: "rgba(148,163,184,0.10)",
  };
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function TooltipRow({ label, value, color, muted }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={muted}>{label}</span>
      <span className="font-semibold tabular-nums" style={{ color }}>
        {formatNumber(value)}
      </span>
    </div>
  );
}

function TooltipText({ label, value, text, muted }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={muted}>{label}</span>
      <span className={`font-medium text-right ${text}`}>{value}</span>
    </div>
  );
}

function CustomTooltip({ active, payload, label, theme = "light" }) {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload || {};
  const t = getThemeTokens(theme);
  const variance = Number(row.actual || 0) - Number(row.target || 0);

  return (
    <div
      className="min-w-[220px] border px-3 py-3 shadow-sm"
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
        <TooltipRow
          label="Variance"
          value={variance}
          color={variance >= 0 ? t.good : t.reject}
          muted={t.muted}
        />
        <TooltipText label="Shift" value={row.shift || "-"} text={t.text} muted={t.muted} />
        <TooltipText label="Part" value={row.part || "-"} text={t.text} muted={t.muted} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, valueColor, theme = "light" }) {
  const t = getThemeTokens(theme);

  return (
    <div className={`border px-3 py-3 ${t.softBg} ${t.border}`}>
      <p className={`text-[10px] uppercase tracking-[0.16em] font-bold ${t.muted}`}>
        {label}
      </p>
      <p className="mt-1 text-base font-bold tabular-nums" style={{ color: valueColor }}>
        {formatNumber(value)}
      </p>
    </div>
  );
}

function MachineSummary({ machine, theme = "light" }) {
  const totals = machine.data.reduce(
    (acc, row) => {
      acc.actual += Number(row.actual || 0);
      acc.good += Number(row.good || 0);
      acc.reject += Number(row.reject || 0);
      acc.target += Number(row.target || 0);
      return acc;
    },
    { actual: 0, good: 0, reject: 0, target: 0 }
  );

  const t = getThemeTokens(theme);

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
      <MiniStat label="Actual" value={totals.actual} valueColor={t.actual} theme={theme} />
      <MiniStat label="Good" value={totals.good} valueColor={t.good} theme={theme} />
      <MiniStat label="Reject" value={totals.reject} valueColor={t.reject} theme={theme} />
      <MiniStat label="Target" value={totals.target} valueColor={t.target} theme={theme} />
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
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] font-bold" style={{ color: t.actual }}>
            Filters
          </p>
          <h4 className={`mt-2 text-base font-bold ${t.title}`}>
            Machine hourly records
          </h4>
        </div>

        <div className={`inline-flex items-center border px-3 py-2 text-xs font-semibold ${t.badge}`}>
          Showing {resultCount} machine{resultCount !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <select
          value={filters.hall}
          onChange={(e) => setFilters((prev) => ({ ...prev, hall: e.target.value }))}
          className={`h-10 border px-3 text-sm outline-none ${t.input}`}
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
          className={`h-10 border px-3 text-sm outline-none ${t.input}`}
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
          className={`h-10 border px-3 text-sm outline-none ${t.input}`}
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
          placeholder="Search operator / part"
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          className={`h-10 border px-3 text-sm outline-none ${t.input}`}
        />

        <select
          value={filters.sortBy}
          onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
          className={`h-10 border px-3 text-sm outline-none ${t.input}`}
        >
          <option value="machine">Sort: Machine</option>
          <option value="actualDesc">Sort: Actual High-Low</option>
          <option value="rejectDesc">Sort: Reject High-Low</option>
          <option value="hoursDesc">Sort: Hours High-Low</option>
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
      const qty = Number(item?.qty || 0);
      acc[reason] = (acc[reason] || 0) + qty;
    });
    return acc;
  }, {});

  const entries = Object.entries(reasonMap).sort((a, b) => b[1] - a[1]);

  if (!entries.length) return null;

  return (
    <div className={`mt-4 border px-4 py-3 ${t.softBg} ${t.border}`}>
      <p className={`text-[11px] uppercase tracking-[0.16em] font-bold ${t.muted}`}>
        Rejection Reasons
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {entries.map(([reason, qty]) => (
          <span
            key={reason}
            className={`border px-3 py-1 text-xs font-semibold ${t.chip}`}
          >
            {reason}: {formatNumber(qty)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MachineHourlyChart({
  machineHourlyTrend,
  theme = "light",
}) {
  const t = getThemeTokens(theme);

  const [filters, setFilters] = useState({
    hall: "",
    shift: "",
    machine: "",
    search: "",
    sortBy: "machine",
  });

  const hallOptions = useMemo(
    () => [...new Set((machineHourlyTrend || []).map((item) => item.hall).filter(Boolean))].sort(),
    [machineHourlyTrend]
  );

  const shiftOptions = useMemo(
    () => [...new Set((machineHourlyTrend || []).map((item) => item.shift).filter(Boolean))].sort(),
    [machineHourlyTrend]
  );

  const machineOptions = useMemo(
    () => [...new Set((machineHourlyTrend || []).map((item) => item.machine).filter(Boolean))].sort(),
    [machineHourlyTrend]
  );

  const filteredMachines = useMemo(() => {
    const list = [...(machineHourlyTrend || [])].filter((item) => {
      const searchText = filters.search.trim().toLowerCase();

      const matchesHall = !filters.hall || item.hall === filters.hall;
      const matchesShift = !filters.shift || item.shift === filters.shift;
      const matchesMachine = !filters.machine || item.machine === filters.machine;

      const haystack = [
        item.machine,
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
          acc.actual += Number(row.actual || 0);
          acc.reject += Number(row.reject || 0);
          return acc;
        },
        { actual: 0, reject: 0 }
      );

    list.sort((a, b) => {
      if (filters.sortBy === "actualDesc") return getTotals(b).actual - getTotals(a).actual;
      if (filters.sortBy === "rejectDesc") return getTotals(b).reject - getTotals(a).reject;
      if (filters.sortBy === "hoursDesc") return b.data.length - a.data.length;
      return String(a.machine || "").localeCompare(String(b.machine || ""));
    });

    return list;
  }, [machineHourlyTrend, filters]);

  if (!machineHourlyTrend?.length) {
    return (
      <section className={`border p-5 ${t.sectionBg} ${t.border}`}>
        <h3 className={`text-lg font-bold ${t.title}`}>Machine Wise Hourly Graph</h3>
        <p className={`text-sm mt-1 ${t.muted}`}>
          Selected filters ke hisab se koi machine hourly data available nahi hai.
        </p>
      </section>
    );
  }

  return (
    <section className={`border p-4 md:p-5 ${t.sectionBg} ${t.border}`}>
      <div className="mb-4">
        <p
          className="text-xs uppercase tracking-[0.2em] font-bold"
          style={{ color: t.actual }}
        >
          Hourly Analysis
        </p>
        <h3 className={`mt-2 text-lg md:text-xl font-bold ${t.title}`}>
          Machine Wise Hourly Graph
        </h3>
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
        className={`border p-3 ${t.panelBg} ${t.border} chart-scroll-area`}
        style={{
          maxHeight: "calc(100vh - 220px)",
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "thin",
          scrollbarColor: `${t.scrollbarThumb} ${t.scrollbarTrack}`,
        }}
      >
        <style>{`
          .chart-scroll-area::-webkit-scrollbar {
            width: 8px;
          }
          .chart-scroll-area::-webkit-scrollbar-track {
            background: ${t.scrollbarTrack};
          }
          .chart-scroll-area::-webkit-scrollbar-thumb {
            background: ${t.scrollbarThumb};
          }
        `}</style>

        {filteredMachines.length === 0 ? (
          <div className={`border p-8 text-center ${t.softBg} ${t.border}`}>
            <h4 className={`text-base font-bold ${t.title}`}>No matching records</h4>
            <p className={`mt-2 text-sm ${t.muted}`}>
              Current filters ke hisaab se koi machine data match nahi hua.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMachines.map((machineItem) => (
              <article
                key={`${machineItem.hall}-${machineItem.machine}`}
                className={`border p-4 ${t.cardBg} ${t.border}`}
              >
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className={`text-base font-bold ${t.title}`}>
                        {machineItem.machine}
                      </h4>
                      <span className={`border px-3 py-1 text-xs font-semibold ${t.badge}`}>
                        {machineItem.hall}
                      </span>
                    </div>

                    <div className={`mt-2 flex flex-wrap gap-2 text-xs ${t.muted}`}>
                      <span className={`border px-3 py-1 ${t.chip}`}>
                        {machineItem.shift || "Shift -"}
                      </span>
                      <span className={`border px-3 py-1 ${t.chip}`}>
                        Operator: {machineItem.operator || "-"}
                      </span>
                      <span className={`border px-3 py-1 ${t.chip}`}>
                        Part: {machineItem.part || "-"}
                      </span>
                    </div>
                  </div>

                  <div className={`border px-4 py-3 ${t.softBg} ${t.border}`}>
                    <p className={`text-[11px] uppercase tracking-[0.14em] ${t.muted}`}>
                      Logged Hours
                    </p>
                    <p className={`mt-1 text-base font-bold ${t.title}`}>
                      {machineItem.data.length}
                    </p>
                  </div>
                </div>

                <MachineSummary machine={machineItem} theme={theme} />

                <div className="h-[220px] md:h-[240px] border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={machineItem.data}
                      margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="2 2" stroke={t.grid} />

                      <XAxis
                        dataKey="hour"
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

                      <Bar
                        dataKey="actual"
                        radius={[0, 0, 0, 0]}
                        barSize={14}
                      >
                        {machineItem.data.map((entry, index) => (
                          <Cell
                            key={`actual-cell-${index}`}
                            fill={getPerformanceColor(entry.actual, entry.target, theme)}
                          />
                        ))}
                      </Bar>

                      <Bar
                        dataKey="good"
                        radius={[0, 0, 0, 0]}
                        barSize={10}
                        fill={t.good}
                      />

                      <Line
                        type="monotone"
                        dataKey="reject"
                        stroke={t.reject}
                        strokeWidth={1.8}
                        dot={{ r: 2.5, strokeWidth: 0, fill: t.reject }}
                        activeDot={{ r: 4 }}
                      />

                      <Line
                        type="monotone"
                        dataKey="target"
                        stroke={t.target}
                        strokeWidth={1.8}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <RejectionReasonsBlock machine={machineItem} theme={theme} />
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}