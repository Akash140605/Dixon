import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Legend,
} from "recharts";
import {
  formatNumber,
  normalizeMachineName,
  normalizePartName,
  toNumber,
} from "../../../data/machineDataHelpers";

const INDUSTRY_COLORS = {
  production: "#2563EB",
  productionSoft: "#DBEAFE",
  good: "#16A34A",
  goodSoft: "#DCFCE7",
  reject: "#DC2626",
  rejectSoft: "#FCA5A5",
  loss: "#D97706",
  lossSoft: "#FED7AA",
  target: "#64748B",
  targetSoft: "#E2E8F0",
  efficiency: "#0284C7",
  efficiencySoft: "#E0F2FE",
  grid: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#475569",
  bgSoft: "#F8FAFC",
  panel: "#FFFFFF",
  border: "#CBD5E1",
};

function formatPercent(value) {
  return `${toNumber(value).toFixed(1)}%`;
}

function truncateLabel(value, limit = 18) {
  const text = String(value || "");
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function formatSafeDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function splitLabel(value, chunkSize = 14) {
  const text = String(value || "").trim();
  if (!text) return ["-"];
  if (text.length <= chunkSize) return [text];

  const words = text.split(" ");
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const trial = current ? `${current} ${word}` : word;
    if (trial.length <= chunkSize) {
      current = trial;
    } else {
      if (current) lines.push(current);
      if (word.length > chunkSize) {
        const parts = word.match(new RegExp(`.{1,${chunkSize}}`, "g")) || [word];
        lines.push(...parts.slice(0, -1));
        current = parts[parts.length - 1] || "";
      } else {
        current = word;
      }
    }
  });

  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function WrappedAxisTick({
  x,
  y,
  payload,
  lineHeight = 13,
  textAnchor = "middle",
}) {
  const lines = splitLabel(payload?.value, 14);

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={10}
        textAnchor={textAnchor}
        fill={INDUSTRY_COLORS.textMuted}
        fontSize={11}
      >
        {lines.map((line, index) => (
          <tspan
            key={`${line}-${index}`}
            x={0}
            dy={index === 0 ? 0 : lineHeight}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function getChartToneClasses(tone) {
  if (tone === "good") {
    return {
      card: "border-emerald-200 bg-emerald-50",
      text: "text-emerald-700",
    };
  }

  if (tone === "reject") {
    return {
      card: "border-rose-200 bg-rose-50",
      text: "text-rose-700",
    };
  }

  if (tone === "loss") {
    return {
      card: "border-amber-200 bg-amber-50",
      text: "text-amber-700",
    };
  }

  if (tone === "efficiency") {
    return {
      card: "border-sky-200 bg-sky-50",
      text: "text-sky-700",
    };
  }

  return {
    card: "border-slate-200 bg-slate-50",
    text: "text-slate-900",
  };
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[8px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="text-sm font-medium text-slate-900">No chart data</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  );
}

function SummaryCard({ label, value, tone = "default", helper }) {
  const toneClasses = getChartToneClasses(tone);

  return (
    <div className={`rounded-[6px] border px-3 py-3 shadow-sm ${toneClasses.card}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-sm font-bold tabular-nums ${toneClasses.text}`}>
        {value}
      </p>
      {helper ? <p className="mt-1 text-[11px] text-slate-500">{helper}</p> : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  allLabel = "All",
}) {
  if (!options.length) return null;

  return (
    <div className="min-w-0">
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        className="h-10 w-full rounded-[4px] border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-500"
      >
        <option value="all">{allLabel}</option>
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}

function SectionBadge({ text }) {
  if (!text) return null;

  return (
    <span className="inline-flex rounded-[4px] border border-slate-300 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
      {text}
    </span>
  );
}

function ChartSection({
  title,
  subtitle,
  rightText,
  filters,
  children,
}) {
  return (
    <div className="rounded-[8px] border border-slate-300 bg-white p-3 shadow-sm">
      <div className="mb-4 rounded-[6px] border border-slate-300 bg-slate-50 p-4">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>

          <SectionBadge text={rightText} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {filters}
        </div>
      </div>

      {children}
    </div>
  );
}

function buildTimelineLabel(row) {
  const dateText = formatSafeDate(row.date);
  const shiftText = row.shiftLabel || row.shift || "";
  const hourText = row.hour || row.duration || "";
  return [dateText, shiftText, hourText].filter(Boolean).join(" • ");
}

function normalizeGraphRow(row = {}, block = {}) {
  const actual = toNumber(row.actual);
  const reject = toNumber(row.reject);
  const shiftRaw = row.shiftLabel || row.shift || block.shiftLabel || block.shift || "";

  return {
    id:
      row.id ||
      `${normalizeMachineName(row || block)}-${row.date || ""}-${row.shift || ""}-${row.hour || row.label || row.slot || ""}`,
    date: row.date || block.date || "",
    dateLabel: formatSafeDate(row.date || block.date || ""),
    shift: row.shift || block.shift || "",
    shiftLabel: row.shiftLabel || block.shiftLabel || "",
    operator:
      row.operator ||
      row.operatorName ||
      block.operator ||
      block.operatorName ||
      "",
    operatorId:
      row.operatorId ||
      row.operatorCode ||
      row.employeeId ||
      block.operatorId ||
      block.operatorCode ||
      block.employeeId ||
      "",
    hall: row.hall || block.hall || "",
    machine:
      row.machine || normalizeMachineName(block) || normalizeMachineName(row),
    part: normalizePartName(row) || normalizePartName(block),
    hour:
      row.hour ||
      row.label ||
      row.slot ||
      row.duration ||
      row.time ||
      "Unknown",
    actual,
    good: toNumber(row.good ?? actual - reject),
    reject,
    target: toNumber(row.target),
    lossQty: toNumber(row.lossQty ?? row.lossTime ?? row.loss ?? 0),
    lossMinutes: toNumber(
      row.lossMinutes ?? row.lossTimeMinutes ?? row.lossMin ?? 0
    ),
    rejectBreakdown: Array.isArray(row.rejectBreakdown) ? row.rejectBreakdown : [],
    lossTimeBreakdown: Array.isArray(row.lossTimeBreakdown) ? row.lossTimeBreakdown : [],
    rejectReason: normalizeText(row.rejectReason),
    remarks: normalizeText(row.remarks || row.comment || row.notes),
    timelineLabel: buildTimelineLabel({
      date: row.date || block.date,
      shiftLabel: shiftRaw,
      shift: shiftRaw,
      hour: row.hour || row.label || row.slot || row.duration || row.time,
    }),
    compactMeta: [formatSafeDate(row.date || block.date), shiftRaw].filter(Boolean).join(" • "),
  };
}

function aggregateRows(rows, groupBy) {
  const grouped = {};

  rows.forEach((row) => {
    const key = normalizeText(row[groupBy]) || "Unknown";

    if (!grouped[key]) {
      grouped[key] = {
        label: key,
        part: row.part || "",
        hour: row.hour || "",
        hall: row.hall || "",
        machine: row.machine || "",
        actual: 0,
        good: 0,
        reject: 0,
        target: 0,
        lossQty: 0,
        lossMinutes: 0,
        rejectionReasons: {},
        lossReasons: {},
        dates: new Set(),
        shifts: new Set(),
      };
    }

    grouped[key].actual += toNumber(row.actual);
    grouped[key].good += toNumber(row.good);
    grouped[key].reject += toNumber(row.reject);
    grouped[key].target += toNumber(row.target);
    grouped[key].lossQty += toNumber(row.lossQty);
    grouped[key].lossMinutes += toNumber(row.lossMinutes);

    if (row.date) grouped[key].dates.add(formatSafeDate(row.date));
    if (row.shiftLabel || row.shift) grouped[key].shifts.add(row.shiftLabel || row.shift);

    (row.rejectBreakdown || []).forEach((item) => {
      const reason = item?.reason || "Other";
      grouped[key].rejectionReasons[reason] =
        toNumber(grouped[key].rejectionReasons[reason]) + toNumber(item?.qty);
    });

    (row.lossTimeBreakdown || []).forEach((item) => {
      const reason = item?.reason || "Other";
      grouped[key].lossReasons[reason] =
        toNumber(grouped[key].lossReasons[reason]) + toNumber(item?.minutes);
    });
  });

  return Object.values(grouped).map((item) => ({
    ...item,
    shortLabel: truncateLabel(item.label, 24),
    efficiency: item.target > 0 ? (item.actual / item.target) * 100 : 0,
    rejectRate: item.actual > 0 ? (item.reject / item.actual) * 100 : 0,
    compactMeta: [
      Array.from(item.dates).slice(0, 2).join(", "),
      Array.from(item.shifts).join(", "),
    ]
      .filter(Boolean)
      .join(" • "),
  }));
}

function getTopReasonData(groupedData, keyName, valueKey) {
  const totals = {};

  groupedData.forEach((item) => {
    Object.entries(item[keyName] || {}).forEach(([reason, value]) => {
      totals[reason] = toNumber(totals[reason]) + toNumber(value);
    });
  });

  return Object.entries(totals)
    .map(([label, value]) => ({
      label,
      shortLabel: truncateLabel(label, 16),
      [valueKey]: toNumber(value),
    }))
    .sort((a, b) => toNumber(b[valueKey]) - toNumber(a[valueKey]))
    .slice(0, 8);
}

function CustomLegend({ payload }) {
  if (!payload?.length) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      {payload.map((entry) => (
        <div
          key={`${entry.value}-${entry.color}`}
          className="inline-flex items-center gap-2 rounded-[4px] border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function GenericTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload;

  return (
    <div className="min-w-[250px] rounded-[6px] border border-slate-300 bg-white p-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-slate-900">{label}</p>

      {row?.compactMeta ? (
        <p className="mb-2 text-xs text-slate-500">{row.compactMeta}</p>
      ) : null}

      <div className="space-y-1 text-xs text-slate-700">
        {payload.map((item) => (
          <div
            key={`${item.dataKey}-${item.name}`}
            className="flex items-center justify-between gap-3"
          >
            <span>{item.name}</span>
            <span className="font-semibold tabular-nums">
              {String(item.name).includes("%")
                ? formatPercent(item.value)
                : formatNumber(item.value)}
            </span>
          </div>
        ))}
      </div>

      {row?.date || row?.shiftLabel || row?.hour || row?.operator || row?.part ? (
        <div className="mt-3 space-y-1 border-t border-slate-200 pt-2 text-xs text-slate-700">
          {row.date ? (
            <div className="flex items-center justify-between gap-3">
              <span>Date</span>
              <span className="font-semibold">{formatSafeDate(row.date)}</span>
            </div>
          ) : null}
          {row.shiftLabel || row.shift ? (
            <div className="flex items-center justify-between gap-3">
              <span>Shift</span>
              <span className="font-semibold">{row.shiftLabel || row.shift}</span>
            </div>
          ) : null}
          {row.hour ? (
            <div className="flex items-center justify-between gap-3">
              <span>Hour</span>
              <span className="font-semibold">{row.hour}</span>
            </div>
          ) : null}
          {row.operator ? (
            <div className="flex items-center justify-between gap-3">
              <span>Operator</span>
              <span className="font-semibold">{row.operator}</span>
            </div>
          ) : null}
          {row.part ? (
            <div className="flex items-center justify-between gap-3">
              <span>Part</span>
              <span className="font-semibold">{row.part}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function getAdaptiveChartHeight(count, base = 320, expanded = 390) {
  if (count <= 2) return 260;
  if (count <= 4) return 290;
  if (count <= 6) return base;
  return expanded;
}

function getAdaptiveBarSize(count, large = 26, small = 18) {
  if (count <= 2) return 34;
  if (count <= 4) return 28;
  if (count <= 7) return large;
  return small;
}

function filterRows(rows, filters) {
  return rows.filter((row) => {
    const partMatch = filters.part === "all" || String(row.part) === String(filters.part);
    const dateMatch =
      filters.date === "all" ||
      String(row.date || "") === String(filters.date || "");
    const shiftMatch =
      filters.shift === "all" ||
      String(row.shiftLabel || row.shift || "") === String(filters.shift);

    return partMatch && dateMatch && shiftMatch;
  });
}

function createFilterState() {
  return {
    part: "all",
    date: "all",
    shift: "all",
  };
}

export default function MachineDetailGraphs({
  machineHourlyTrend = [],
  hourlyTable = [],
}) {
  const normalizedRows = useMemo(() => {
    const rows = [];

    machineHourlyTrend.forEach((machineBlock) => {
      if (Array.isArray(machineBlock?.data) && machineBlock.data.length) {
        machineBlock.data.forEach((row) => {
          rows.push(normalizeGraphRow(row, machineBlock));
        });
      } else if (machineBlock && typeof machineBlock === "object") {
        rows.push(normalizeGraphRow(machineBlock, machineBlock));
      }
    });

    if (!rows.length && Array.isArray(hourlyTable)) {
      hourlyTable.forEach((row) => {
        rows.push(normalizeGraphRow(row, row));
      });
    }

    return rows.sort((a, b) =>
      String(a.timelineLabel || "").localeCompare(String(b.timelineLabel || ""))
    );
  }, [machineHourlyTrend, hourlyTable]);

  const partOptions = useMemo(
    () => [...new Set(normalizedRows.map((row) => row.part).filter(Boolean))].sort(),
    [normalizedRows]
  );

  const dateOptions = useMemo(
    () => [...new Set(normalizedRows.map((row) => row.date).filter(Boolean))].sort(),
    [normalizedRows]
  );

  const shiftOptions = useMemo(
    () =>
      [...new Set(normalizedRows.map((row) => row.shiftLabel || row.shift).filter(Boolean))].sort(),
    [normalizedRows]
  );

  const [overallFilters, setOverallFilters] = useState(createFilterState());
  const [efficiencyFilters, setEfficiencyFilters] = useState(createFilterState());
  const [rejectionFilters, setRejectionFilters] = useState(createFilterState());
  const [lossFilters, setLossFilters] = useState(createFilterState());

  useEffect(() => {
    setOverallFilters(createFilterState());
    setEfficiencyFilters(createFilterState());
    setRejectionFilters(createFilterState());
    setLossFilters(createFilterState());
  }, [machineHourlyTrend, hourlyTable]);

  const summary = useMemo(() => {
    return normalizedRows.reduce(
      (acc, row) => {
        acc.actual += toNumber(row.actual);
        acc.good += toNumber(row.good);
        acc.reject += toNumber(row.reject);
        acc.target += toNumber(row.target);
        acc.lossQty += toNumber(row.lossQty);
        acc.lossMinutes += toNumber(row.lossMinutes);
        return acc;
      },
      {
        actual: 0,
        good: 0,
        reject: 0,
        target: 0,
        lossQty: 0,
        lossMinutes: 0,
      }
    );
  }, [normalizedRows]);

  const filteredOverallRows = useMemo(
    () => filterRows(normalizedRows, overallFilters),
    [normalizedRows, overallFilters]
  );

  const filteredEfficiencyRows = useMemo(
    () => filterRows(normalizedRows, efficiencyFilters),
    [normalizedRows, efficiencyFilters]
  );

  const filteredRejectionRows = useMemo(
    () => filterRows(normalizedRows, rejectionFilters),
    [normalizedRows, rejectionFilters]
  );

  const filteredLossRows = useMemo(
    () => filterRows(normalizedRows, lossFilters),
    [normalizedRows, lossFilters]
  );

  const productionTrendData = useMemo(
    () =>
      filteredOverallRows.map((row) => ({
        ...row,
        shortLabel: truncateLabel(row.timelineLabel || row.hour, 22),
      })),
    [filteredOverallRows]
  );

  const efficiencyData = useMemo(
    () =>
      aggregateRows(filteredEfficiencyRows, "part").sort(
        (a, b) => b.efficiency - a.efficiency
      ),
    [filteredEfficiencyRows]
  );

  const rejectionOverviewData = useMemo(
    () =>
      aggregateRows(filteredRejectionRows, "part").sort(
        (a, b) => b.reject - a.reject
      ),
    [filteredRejectionRows]
  );

  const lossOverviewData = useMemo(
    () =>
      aggregateRows(filteredLossRows, "part").sort(
        (a, b) => b.lossMinutes - a.lossMinutes
      ),
    [filteredLossRows]
  );

  const rejectionReasonData = useMemo(
    () =>
      getTopReasonData(
        aggregateRows(filteredRejectionRows, "part"),
        "rejectionReasons",
        "qty"
      ),
    [filteredRejectionRows]
  );

  const lossReasonData = useMemo(
    () =>
      getTopReasonData(
        aggregateRows(filteredLossRows, "part"),
        "lossReasons",
        "minutes"
      ),
    [filteredLossRows]
  );

  const overallEfficiency =
    summary.target > 0 ? (summary.actual / summary.target) * 100 : 0;

  const productionChartHeight = getAdaptiveChartHeight(productionTrendData.length, 330, 400);
  const efficiencyChartHeight = getAdaptiveChartHeight(efficiencyData.length, 300, 380);
  const rejectionChartHeight = getAdaptiveChartHeight(rejectionOverviewData.length, 310, 390);
  const lossChartHeight = getAdaptiveChartHeight(lossOverviewData.length, 310, 390);
  const rejectionReasonChartHeight = getAdaptiveChartHeight(rejectionReasonData.length, 290, 360);
  const lossReasonChartHeight = getAdaptiveChartHeight(lossReasonData.length, 290, 360);

  const productionBarSize = getAdaptiveBarSize(productionTrendData.length, 22, 16);
  const mainBarSize = getAdaptiveBarSize(
    Math.max(
      efficiencyData.length,
      rejectionOverviewData.length,
      lossOverviewData.length,
      rejectionReasonData.length,
      lossReasonData.length
    ),
    26,
    18
  );

  return (
    <section className="rounded-[8px] border border-slate-300 bg-white p-3 shadow-sm md:p-4">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 md:text-lg">
            Efficiency, Rejection and Loss Analysis
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Selected machine ke hourly, date-wise, shift-wise aur part-level operational insights.
          </p>
        </div>

        <SectionBadge text={`${normalizedRows.length} records`} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <SummaryCard label="Actual" value={formatNumber(summary.actual)} />
        <SummaryCard label="Good" value={formatNumber(summary.good)} tone="good" />
        <SummaryCard label="Reject" value={formatNumber(summary.reject)} tone="reject" />
        <SummaryCard label="Loss Qty" value={formatNumber(summary.lossQty)} tone="loss" />
        <SummaryCard label="Loss Min" value={formatNumber(summary.lossMinutes)} tone="loss" />
        <SummaryCard
          label="Efficiency"
          value={formatPercent(overallEfficiency)}
          tone="efficiency"
          helper="Actual / Target × 100"
        />
      </div>

      <div className="space-y-6">
        <ChartSection
          title="Production Trend"
          subtitle="Date, shift aur time ke hisaab se actual, good, reject aur target."
          rightText={`${productionTrendData.length} points`}
          filters={
            <>
              <SelectField
                label="Part"
                value={overallFilters.part}
                onChange={(e) =>
                  setOverallFilters((prev) => ({ ...prev, part: e.target.value }))
                }
                options={partOptions}
                allLabel="All Parts"
              />
              <SelectField
                label="Date"
                value={overallFilters.date}
                onChange={(e) =>
                  setOverallFilters((prev) => ({ ...prev, date: e.target.value }))
                }
                options={dateOptions}
                allLabel="All Dates"
              />
              <SelectField
                label="Shift"
                value={overallFilters.shift}
                onChange={(e) =>
                  setOverallFilters((prev) => ({ ...prev, shift: e.target.value }))
                }
                options={shiftOptions}
                allLabel="All Shifts"
              />
            </>
          }
        >
          {productionTrendData.length ? (
            <div style={{ height: productionChartHeight }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={productionTrendData}
                  margin={{ top: 20, right: 18, left: 0, bottom: 52 }}
                >
                  <CartesianGrid
                    stroke={INDUSTRY_COLORS.grid}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="shortLabel"
                    interval={0}
                    height={58}
                    tick={<WrappedAxisTick />}
                    tickMargin={10}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: INDUSTRY_COLORS.textMuted }}
                    tickSize={0}
                    width={38}
                  />
                  <Tooltip content={<GenericTooltip />} />
                  <Legend content={<CustomLegend />} />
                  <Bar
                    dataKey="actual"
                    name="Actual"
                    fill={INDUSTRY_COLORS.production}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={productionBarSize}
                  />
                  <Bar
                    dataKey="good"
                    name="Good"
                    fill={INDUSTRY_COLORS.good}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={productionBarSize}
                  />
                  <Line
                    type="monotone"
                    dataKey="reject"
                    name="Reject"
                    stroke={INDUSTRY_COLORS.reject}
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    name="Target"
                    stroke={INDUSTRY_COLORS.target}
                    strokeDasharray="5 4"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState text="Production trend data is not available for the selected filters." />
          )}
        </ChartSection>

        <div className="grid gap-6 xl:grid-cols-2">
          <ChartSection
            title="Efficiency Graph"
            subtitle="Part-wise efficiency with compact view for small data."
            rightText={`${efficiencyData.length} items`}
            filters={
              <>
                <SelectField
                  label="Part"
                  value={efficiencyFilters.part}
                  onChange={(e) =>
                    setEfficiencyFilters((prev) => ({ ...prev, part: e.target.value }))
                  }
                  options={partOptions}
                  allLabel="All Parts"
                />
                <SelectField
                  label="Date"
                  value={efficiencyFilters.date}
                  onChange={(e) =>
                    setEfficiencyFilters((prev) => ({ ...prev, date: e.target.value }))
                  }
                  options={dateOptions}
                  allLabel="All Dates"
                />
                <SelectField
                  label="Shift"
                  value={efficiencyFilters.shift}
                  onChange={(e) =>
                    setEfficiencyFilters((prev) => ({ ...prev, shift: e.target.value }))
                  }
                  options={shiftOptions}
                  allLabel="All Shifts"
                />
              </>
            }
          >
            {efficiencyData.length ? (
              <div style={{ height: efficiencyChartHeight }} className="w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={efficiencyData}
                    margin={{ top: 20, right: 18, left: 0, bottom: 58 }}
                  >
                    <CartesianGrid
                      stroke={INDUSTRY_COLORS.grid}
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="shortLabel"
                      interval={0}
                      height={60}
                      tick={<WrappedAxisTick />}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: INDUSTRY_COLORS.textMuted }}
                      tickSize={0}
                      width={38}
                    />
                    <Tooltip content={<GenericTooltip />} />
                    <Bar
                      dataKey="efficiency"
                      name="Efficiency %"
                      fill={INDUSTRY_COLORS.efficiency}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={mainBarSize}
                    >
                      <LabelList
                        dataKey="efficiency"
                        position="top"
                        offset={8}
                        formatter={formatPercent}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState text="Efficiency graph data is not available for the selected filters." />
            )}
          </ChartSection>

          <ChartSection
            title="Rejection Graph"
            subtitle="Part-wise reject qty aur reject rate ko side-by-side samjho."
            rightText={`${rejectionOverviewData.length} items`}
            filters={
              <>
                <SelectField
                  label="Part"
                  value={rejectionFilters.part}
                  onChange={(e) =>
                    setRejectionFilters((prev) => ({ ...prev, part: e.target.value }))
                  }
                  options={partOptions}
                  allLabel="All Parts"
                />
                <SelectField
                  label="Date"
                  value={rejectionFilters.date}
                  onChange={(e) =>
                    setRejectionFilters((prev) => ({ ...prev, date: e.target.value }))
                  }
                  options={dateOptions}
                  allLabel="All Dates"
                />
                <SelectField
                  label="Shift"
                  value={rejectionFilters.shift}
                  onChange={(e) =>
                    setRejectionFilters((prev) => ({ ...prev, shift: e.target.value }))
                  }
                  options={shiftOptions}
                  allLabel="All Shifts"
                />
              </>
            }
          >
            {rejectionOverviewData.length ? (
              <div style={{ height: rejectionChartHeight }} className="w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={rejectionOverviewData}
                    margin={{ top: 20, right: 18, left: 0, bottom: 58 }}
                  >
                    <CartesianGrid
                      stroke={INDUSTRY_COLORS.grid}
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="shortLabel"
                      interval={0}
                      height={60}
                      tick={<WrappedAxisTick />}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: INDUSTRY_COLORS.textMuted }}
                      tickSize={0}
                      width={38}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: INDUSTRY_COLORS.textMuted }}
                      tickSize={0}
                      width={38}
                    />
                    <Tooltip content={<GenericTooltip />} />
                    <Legend content={<CustomLegend />} />
                    <Bar
                      yAxisId="left"
                      dataKey="reject"
                      name="Reject Qty"
                      fill={INDUSTRY_COLORS.reject}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={mainBarSize}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="rejectRate"
                      name="Reject Rate %"
                      stroke={INDUSTRY_COLORS.rejectSoft}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState text="Rejection graph data is not available for the selected filters." />
            )}
          </ChartSection>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <ChartSection
            title="Top Rejection Reasons"
            subtitle="Sabse common rejection reasons with qty impact."
            rightText={`${rejectionReasonData.length} reasons`}
            filters={
              <>
                <SelectField
                  label="Part"
                  value={rejectionFilters.part}
                  onChange={(e) =>
                    setRejectionFilters((prev) => ({ ...prev, part: e.target.value }))
                  }
                  options={partOptions}
                  allLabel="All Parts"
                />
                <SelectField
                  label="Date"
                  value={rejectionFilters.date}
                  onChange={(e) =>
                    setRejectionFilters((prev) => ({ ...prev, date: e.target.value }))
                  }
                  options={dateOptions}
                  allLabel="All Dates"
                />
                <SelectField
                  label="Shift"
                  value={rejectionFilters.shift}
                  onChange={(e) =>
                    setRejectionFilters((prev) => ({ ...prev, shift: e.target.value }))
                  }
                  options={shiftOptions}
                  allLabel="All Shifts"
                />
              </>
            }
          >
            {rejectionReasonData.length ? (
              <div style={{ height: rejectionReasonChartHeight }} className="w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={rejectionReasonData}
                    margin={{ top: 20, right: 18, left: 0, bottom: 66 }}
                  >
                    <CartesianGrid
                      stroke={INDUSTRY_COLORS.grid}
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="shortLabel"
                      interval={0}
                      height={70}
                      tick={<WrappedAxisTick />}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: INDUSTRY_COLORS.textMuted }}
                      tickSize={0}
                      width={38}
                    />
                    <Tooltip content={<GenericTooltip />} />
                    <Bar
                      dataKey="qty"
                      name="Reject Qty"
                      fill={INDUSTRY_COLORS.reject}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={mainBarSize}
                    >
                      <LabelList
                        dataKey="qty"
                        position="top"
                        offset={8}
                        formatter={formatNumber}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState text="Top rejection reasons are not available for the selected filters." />
            )}
          </ChartSection>

          <ChartSection
            title="Loss Time Graph"
            subtitle="Part-wise loss minutes aur downtime-heavy areas."
            rightText={`${lossOverviewData.length} items`}
            filters={
              <>
                <SelectField
                  label="Part"
                  value={lossFilters.part}
                  onChange={(e) =>
                    setLossFilters((prev) => ({ ...prev, part: e.target.value }))
                  }
                  options={partOptions}
                  allLabel="All Parts"
                />
                <SelectField
                  label="Date"
                  value={lossFilters.date}
                  onChange={(e) =>
                    setLossFilters((prev) => ({ ...prev, date: e.target.value }))
                  }
                  options={dateOptions}
                  allLabel="All Dates"
                />
                <SelectField
                  label="Shift"
                  value={lossFilters.shift}
                  onChange={(e) =>
                    setLossFilters((prev) => ({ ...prev, shift: e.target.value }))
                  }
                  options={shiftOptions}
                  allLabel="All Shifts"
                />
              </>
            }
          >
            {lossOverviewData.length ? (
              <div style={{ height: lossChartHeight }} className="w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={lossOverviewData}
                    margin={{ top: 20, right: 18, left: 0, bottom: 58 }}
                  >
                    <CartesianGrid
                      stroke={INDUSTRY_COLORS.grid}
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="shortLabel"
                      interval={0}
                      height={60}
                      tick={<WrappedAxisTick />}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: INDUSTRY_COLORS.textMuted }}
                      tickSize={0}
                      width={38}
                    />
                    <Tooltip content={<GenericTooltip />} />
                    <Bar
                      dataKey="lossMinutes"
                      name="Loss Min"
                      fill={INDUSTRY_COLORS.loss}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={mainBarSize}
                    >
                      <LabelList
                        dataKey="lossMinutes"
                        position="top"
                        offset={8}
                        formatter={formatNumber}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState text="Loss time graph data is not available for the selected filters." />
            )}
          </ChartSection>
        </div>

        <ChartSection
          title="Top Loss Reasons"
          subtitle="Loss minutes kis reason ki wajah se aa rahe hain, wo yahan clear dikhega."
          rightText={`${lossReasonData.length} reasons`}
          filters={
            <>
              <SelectField
                label="Part"
                value={lossFilters.part}
                onChange={(e) =>
                  setLossFilters((prev) => ({ ...prev, part: e.target.value }))
                }
                options={partOptions}
                allLabel="All Parts"
              />
              <SelectField
                label="Date"
                value={lossFilters.date}
                onChange={(e) =>
                  setLossFilters((prev) => ({ ...prev, date: e.target.value }))
                }
                options={dateOptions}
                allLabel="All Dates"
              />
              <SelectField
                label="Shift"
                value={lossFilters.shift}
                onChange={(e) =>
                  setLossFilters((prev) => ({ ...prev, shift: e.target.value }))
                }
                options={shiftOptions}
                allLabel="All Shifts"
              />
            </>
          }
        >
          {lossReasonData.length ? (
            <div style={{ height: lossReasonChartHeight }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={lossReasonData}
                  margin={{ top: 20, right: 18, left: 0, bottom: 66 }}
                >
                  <CartesianGrid
                    stroke={INDUSTRY_COLORS.grid}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="shortLabel"
                    interval={0}
                    height={70}
                    tick={<WrappedAxisTick />}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: INDUSTRY_COLORS.textMuted }}
                    tickSize={0}
                    width={38}
                  />
                  <Tooltip content={<GenericTooltip />} />
                  <Bar
                    dataKey="minutes"
                    name="Loss Minutes"
                    fill={INDUSTRY_COLORS.loss}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={mainBarSize}
                  >
                    <LabelList
                      dataKey="minutes"
                      position="top"
                      offset={8}
                      formatter={formatNumber}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState text="Top loss reasons are not available for the selected filters." />
          )}
        </ChartSection>
      </div>
    </section>
  );
}