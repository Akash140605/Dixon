import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

const VIEW_OPTIONS = [
  { key: "hourly", label: "Hourly" },
  { key: "machine", label: "Machine" },
  { key: "day", label: "Day" },
];

const METRIC_OPTIONS = [
  { key: "actual", label: "Actual" },
  { key: "good", label: "Good" },
  { key: "reject", label: "Reject" },
  { key: "target", label: "Target" },
];

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function normalizeHourLabel(item, index) {
  return (
    item.hour ||
    item.hourLabel ||
    item.time ||
    item.timeSlot ||
    `Row ${index + 1}`
  );
}

function formatDayLabel(value, index) {
  if (!value) return `Day ${index + 1}`;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function getColor(metric) {
  if (metric === "good") return "#16a34a";
  if (metric === "reject") return "#e11d48";
  if (metric === "target") return "#64748b";
  return "#0ea5e9";
}

function getMetricChip(metric, active) {
  if (!active) {
    return "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
  }

  if (metric === "good") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (metric === "reject") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (metric === "target") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
}

function InsightStat({ label, value, tone = "default" }) {
  const toneClass =
    tone === "good"
      ? "text-emerald-700"
      : tone === "reject"
      ? "text-rose-700"
      : tone === "target"
      ? "text-slate-700"
      : "text-sky-700";

  return (
    <div className="border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-sm font-bold tabular-nums ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function CustomTooltip({ active, payload, label, metric }) {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload || {};

  return (
    <div className="min-w-[220px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <p className="mb-2 text-sm font-bold text-slate-900">{label}</p>

      <div className="space-y-1 text-xs text-slate-700">
        {row.machine ? (
          <div className="flex items-center justify-between gap-4">
            <span>Machine</span>
            <span className="font-semibold">{row.machine}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <span>Actual</span>
          <span className="font-semibold tabular-nums">{formatNumber(row.actual)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Good</span>
          <span className="font-semibold tabular-nums">{formatNumber(row.good)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Reject</span>
          <span className="font-semibold tabular-nums">{formatNumber(row.reject)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Target</span>
          <span className="font-semibold tabular-nums">{formatNumber(row.target)}</span>
        </div>

        <div className="mt-2 border-t border-slate-200 pt-2 flex items-center justify-between gap-4">
          <span className="capitalize">{metric}</span>
          <span className="font-semibold tabular-nums">
            {formatNumber(row[metric])}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ProductionInsightsChart({
  hourlyTable = [],
  machineHourlyTrend = [],
  dayWiseTrend = [],
}) {
  const [view, setView] = useState("hourly");
  const [metric, setMetric] = useState("actual");
  const [selectedMachine, setSelectedMachine] = useState("all");

  const machineOptions = useMemo(() => {
    const machines = [
      ...new Set((machineHourlyTrend || []).map((item) => item.machine).filter(Boolean)),
    ];
    return machines.sort();
  }, [machineHourlyTrend]);

  const hourlyData = useMemo(() => {
    const source =
      selectedMachine === "all"
        ? hourlyTable
        : (machineHourlyTrend || []).filter(
            (item) => String(item.machine) === String(selectedMachine)
          );

    return (source || []).map((item, index) => ({
      label: normalizeHourLabel(item, index),
      actual: Number(item.actual || 0),
      good: Number(item.good || 0),
      reject: Number(item.reject || 0),
      target: Number(item.target || 0),
      machine: item.machine || "",
    }));
  }, [hourlyTable, machineHourlyTrend, selectedMachine]);

  const machineData = useMemo(() => {
    const grouped = {};

    (machineHourlyTrend || []).forEach((item) => {
      const machine = item.machine || "Unknown";
      if (!grouped[machine]) {
        grouped[machine] = {
          label: machine,
          machine,
          actual: 0,
          good: 0,
          reject: 0,
          target: 0,
        };
      }

      grouped[machine].actual += Number(item.actual || 0);
      grouped[machine].good += Number(item.good || 0);
      grouped[machine].reject += Number(item.reject || 0);
      grouped[machine].target += Number(item.target || 0);
    });

    return Object.values(grouped)
      .sort((a, b) => Number(b[metric] || 0) - Number(a[metric] || 0))
      .slice(0, 8);
  }, [machineHourlyTrend, metric]);

  const dayData = useMemo(() => {
    return (dayWiseTrend || []).map((item, index) => ({
      label: formatDayLabel(item.date || item.day || item.label, index),
      actual: Number(item.actual || item.production || 0),
      good: Number(item.good || 0),
      reject: Number(item.reject || 0),
      target: Number(item.target || 0),
    }));
  }, [dayWiseTrend]);

  const currentData = useMemo(() => {
    if (view === "machine") return machineData;
    if (view === "day") return dayData;
    return hourlyData;
  }, [view, machineData, dayData, hourlyData]);

  const summary = useMemo(() => {
    const totals = currentData.reduce(
      (acc, item) => {
        acc.actual += Number(item.actual || 0);
        acc.good += Number(item.good || 0);
        acc.reject += Number(item.reject || 0);
        acc.target += Number(item.target || 0);
        return acc;
      },
      { actual: 0, good: 0, reject: 0, target: 0 }
    );

    const topItem = [...currentData].sort(
      (a, b) => Number(b[metric] || 0) - Number(a[metric] || 0)
    )[0];

    return {
      ...totals,
      count: currentData.length,
      topLabel: topItem?.label || "-",
      topValue: topItem?.[metric] || 0,
    };
  }, [currentData, metric]);

  const color = getColor(metric);

  return (
    <section className="border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 md:text-xl">
              Production Insights
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Hourly, machine aur daily production ko simple aur clean form mein dekho.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <InsightStat label="Total Actual" value={formatNumber(summary.actual)} />
            <InsightStat label="Total Good" value={formatNumber(summary.good)} tone="good" />
            <InsightStat label="Total Reject" value={formatNumber(summary.reject)} tone="reject" />
            <InsightStat label={`Top ${view}`} value={summary.topLabel} tone="target" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setView(option.key)}
              className={`border px-4 py-2 text-sm font-semibold transition ${
                view === option.key
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {METRIC_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setMetric(option.key)}
                className={`border px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition ${getMetricChip(
                  option.key,
                  metric === option.key
                )}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {view === "hourly" ? (
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Machine
              </label>
              <select
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
              >
                <option value="all">All Machines</option>
                {machineOptions.map((machine) => (
                  <option key={machine} value={machine}>
                    {machine}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </div>

      {currentData.length > 0 ? (
        <div className="space-y-5">
          {(view === "hourly" || view === "machine") && (
            <div className="h-[360px] w-full rounded-xl border border-slate-200 bg-slate-50 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={currentData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    interval={0}
                    angle={currentData.length > 6 ? -20 : 0}
                    textAnchor={currentData.length > 6 ? "end" : "middle"}
                    height={currentData.length > 6 ? 50 : 30}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#475569" }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip content={<CustomTooltip metric={metric} />} />
                  <Bar dataKey={metric} radius={[6, 6, 0, 0]} barSize={view === "machine" ? 30 : 24}>
                    {currentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {view === "day" && (
            <div className="h-[360px] w-full rounded-xl border border-slate-200 bg-slate-50 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentData} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "#475569" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#475569" }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip content={<CustomTooltip metric={metric} />} />
                  <Line
                    type="monotone"
                    dataKey={metric}
                    stroke={color}
                    strokeWidth={3}
                    dot={{ r: 3, fill: color }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <InsightStat label="Active View" value={view} tone="target" />
            <InsightStat label="Active Metric" value={metric} tone="target" />
            <InsightStat label="Records" value={formatNumber(summary.count)} />
            <InsightStat label="Top Value" value={formatNumber(summary.topValue)} tone="good" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm leading-6 text-slate-600">
              <span className="font-bold text-slate-900">How to read:</span> Hourly view se time slots compare karo, Machine view se top machines identify karo, aur Day view se overall trend samjho. Clean metric switcher ki wajah se ek time par ek hi signal clearly dikhega.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
          Selected view ke liye data available nahi hai.
        </div>
      )}
    </section>
  );
}