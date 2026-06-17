import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useProduction } from "../../../context/ProductionContext";
import {
  buildMachineRows,
  hallLabelToId,
  readLocalProductionData,
  toNumber,
} from "../../../data/machineDataHelpers";

const FIXED_HALLS = [
  { label: "Hall 1", aliases: ["Hall 1", "H1"] },
  { label: "Hall 2", aliases: ["Hall 2", "H2"] },
  { label: "Hall 3", aliases: ["Hall 3", "H3"] },
  { label: "Hall 4", aliases: ["Hall 4", "H4"] },
  { label: "C8", aliases: ["C8", "Hall 5", "H5"] },
];

function getArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatNumber(value) {
  return toNumber(value).toLocaleString("en-IN");
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function getEfficiencyConfig(efficiency) {
  const value = toNumber(efficiency);

  if (value >= 90) {
    return {
      label: "Optimal",
      badge: "border-emerald-300 bg-emerald-50 text-emerald-700",
      dot: "bg-emerald-500",
      valueClass: "text-emerald-600",
      progress: "bg-emerald-600",
      panel: "bg-emerald-50",
      note: "Production running well",
    };
  }

  if (value >= 75) {
    return {
      label: "Stable",
      badge: "border-lime-300 bg-lime-50 text-lime-700",
      dot: "bg-lime-500",
      valueClass: "text-lime-600",
      progress: "bg-lime-600",
      panel: "bg-lime-50",
      note: "Stable hall performance",
    };
  }

  return {
    label: "Attention",
    badge: "border-amber-300 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    valueClass: "text-amber-600",
    progress: "bg-amber-500",
    panel: "bg-amber-50",
    note: "Needs performance review",
  };
}

function SummaryStat({ label, value, tone = "default" }) {
  const toneMap = {
    default: "border-slate-300 bg-white text-slate-900",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <div className={`min-w-0 rounded-[4px] border px-3 py-2.5 ${toneMap[tone] || toneMap.default}`}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold tabular-nums leading-snug">
        {value}
      </p>
    </div>
  );
}

function HallCard({ hall }) {
  const hasData =
    hall.actual > 0 ||
    hall.good > 0 ||
    hall.reject > 0 ||
    hall.target > 0 ||
    hall.lossMinutes > 0 ||
    hall.machineCount > 0;

  const efficiencyConfig = getEfficiencyConfig(hall.efficiency);
  const progressWidth = Math.max(0, Math.min(100, hall.efficiency));
  const rejectRate = hall.actual > 0 ? (hall.reject / hall.actual) * 100 : 0;

  return (
    <article className="overflow-hidden rounded-[8px] border border-slate-300 bg-white shadow-sm transition-colors duration-200 hover:border-slate-400">
      <div className="h-1 bg-slate-300" />

      <div className="p-3">
        <div className="rounded-[6px] border border-slate-300 bg-slate-50">
          <div className="flex items-center justify-between gap-2 border-b border-slate-300 bg-slate-100 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 ${efficiencyConfig.dot}`} />
              <span className="h-2.5 w-2.5 bg-slate-300" />
              <span className="h-2.5 w-2.5 bg-slate-300" />
            </div>

            <span className="shrink-0 rounded-[4px] border border-slate-300 bg-white px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
              Hall Unit
            </span>
          </div>

          <div className="p-3">
<div className="rounded-[8px] border border-[#A5B4FC] bg-[#E8E7FF] px-3 py-3 shadow-sm">
  <div className="flex min-w-0 items-start justify-between gap-3">
    <div className="min-w-0 flex-1">
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#4338CA]">
        Hall Name
      </p>

      <h2 className="mt-1 break-words text-lg font-bold tracking-tight text-[#231E5B]">
        {hall.hall}
      </h2>

      <p className="mt-1 break-words text-xs leading-snug text-[#312E81]">
        {hasData
          ? efficiencyConfig.note
          : "No production data available yet"}
      </p>
    </div>

    <span
      className={`shrink-0 rounded-[4px] border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${efficiencyConfig.badge}`}
    >
      {hasData ? efficiencyConfig.label : "No Data"}
    </span>
  </div>

  <div className="mt-4 grid grid-cols-2 gap-3">
    <div className="min-w-0">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#4338CA]">
        Efficiency
      </p>

      <p className="mt-1 break-words text-[22px] font-bold leading-none tabular-nums text-[#231E5B]">
        {hall.efficiency.toFixed(1)}%
      </p>
    </div>

    <div className="min-w-0 text-right">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#4338CA]">
        Reject Rate
      </p>

      <p className="mt-1 break-words text-base font-bold tabular-nums text-red-600">
        {rejectRate.toFixed(1)}%
      </p>
    </div>
  </div>

  <div className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-200">
    <div
      className={`h-full ${efficiencyConfig.progress}`}
      style={{ width: `${progressWidth}%` }}
    />
  </div>
</div>

            <div
              className={`mt-3 rounded-[6px] border border-slate-300 px-3 py-3 ${efficiencyConfig.panel}`}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Machines
                  </p>
                  <p className="mt-1 break-words text-sm font-bold tabular-nums text-slate-900">
                    {formatNumber(hall.machineCount)}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Loss Minutes
                  </p>
                  <p className="mt-1 break-words text-sm font-bold tabular-nums text-amber-700">
                    {formatNumber(hall.lossMinutes)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <SummaryStat label="Target" value={formatNumber(hall.target)} />
              <SummaryStat label="Actual" value={formatNumber(hall.actual)} tone="sky" />
              <SummaryStat label="Good" value={formatNumber(hall.good)} tone="emerald" />
              <SummaryStat label="Reject" value={formatNumber(hall.reject)} tone="rose" />
            </div>

            <div className="mt-3 flex min-w-0 items-center gap-3 rounded-[6px] border border-slate-300 bg-slate-100 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Navigation
                </p>
                <p className="mt-1 break-words text-sm font-bold leading-snug text-slate-800">
                  Open hall machine overview
                </p>
              </div>

              <Link
                to={`/hall/${hallLabelToId(hall.hall)}`}
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-[4px] border border-emerald-700 bg-emerald-700 px-3.5 text-[11px] font-semibold text-white transition hover:bg-emerald-800"
              >
                Open
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="h-1 bg-slate-300" />
    </article>
  );
}

function EmptyState() {
  return (
    <section className="rounded-[8px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto h-12 w-12 border border-slate-300 bg-slate-100" />

      <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">
        No hall data found
      </h2>

      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
        Hall overview ke liye abhi matching production data available nahi mila.
      </p>
    </section>
  );
}

export default function HallCardsView() {
  const { machineHourlyTrend, filteredDashboardData } = useProduction();
  const localData = useMemo(() => readLocalProductionData(), []);

  const mergedMachineTrend =
    getArray(machineHourlyTrend).length > 0
      ? getArray(machineHourlyTrend)
      : getArray(
          localData?.machineHourlyTrend ||
            localData?.filteredDashboardData?.machineHourlyTrend ||
            localData?.machineWiseHourlyTrend,
        );

  const mergedHourlyTable =
    getArray(filteredDashboardData?.hourlyTable).length > 0
      ? getArray(filteredDashboardData?.hourlyTable)
      : getArray(
          localData?.hourlyTable ||
            localData?.filteredDashboardData?.hourlyTable ||
            localData?.hourlyProduction ||
            localData?.rows,
        );

  const allRows = useMemo(
    () => buildMachineRows(mergedMachineTrend, mergedHourlyTable),
    [mergedMachineTrend, mergedHourlyTable],
  );

  const halls = useMemo(() => {
    const grouped = {};

    allRows.forEach((row) => {
      const key = normalizeKey(row.hall || "Unknown Hall");

      if (!grouped[key]) {
        grouped[key] = {
          hall: row.hall || "Unknown Hall",
          machineSet: new Set(),
          actual: 0,
          good: 0,
          reject: 0,
          target: 0,
          lossMinutes: 0,
        };
      }

      grouped[key].machineSet.add(row.machine);
      grouped[key].actual += toNumber(row.actual);
      grouped[key].good += toNumber(row.good);
      grouped[key].reject += toNumber(row.reject);
      grouped[key].target += toNumber(row.target);
      grouped[key].lossMinutes += toNumber(row.lossMinutes);
    });

    return FIXED_HALLS.map((hallConfig) => {
      const matchedEntries = hallConfig.aliases
        .map((alias) => grouped[normalizeKey(alias)])
        .filter(Boolean);

      const merged = matchedEntries.reduce(
        (acc, entry) => {
          if (entry.machineSet instanceof Set) {
            entry.machineSet.forEach((machine) => acc.machineSet.add(machine));
          }
          acc.actual += toNumber(entry.actual);
          acc.good += toNumber(entry.good);
          acc.reject += toNumber(entry.reject);
          acc.target += toNumber(entry.target);
          acc.lossMinutes += toNumber(entry.lossMinutes);
          return acc;
        },
        {
          hall: hallConfig.label,
          machineSet: new Set(),
          actual: 0,
          good: 0,
          reject: 0,
          target: 0,
          lossMinutes: 0,
        },
      );

      const machineCount = merged.machineSet.size;
      const actual = toNumber(merged.actual);
      const good = toNumber(merged.good);
      const reject = toNumber(merged.reject);
      const target = toNumber(merged.target);
      const lossMinutes = toNumber(merged.lossMinutes);
      const efficiency = target > 0 ? (actual / target) * 100 : 0;

      return {
        hall: hallConfig.label,
        machineCount,
        actual,
        good,
        reject,
        target,
        lossMinutes,
        efficiency,
      };
    });
  }, [allRows]);

  const hasAnyData = halls.some(
    (hall) =>
      hall.actual > 0 ||
      hall.good > 0 ||
      hall.reject > 0 ||
      hall.target > 0 ||
      hall.lossMinutes > 0 ||
      hall.machineCount > 0,
  );

  if (!hasAnyData) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      {halls.map((hall) => (
        <HallCard key={hall.hall} hall={hall} />
      ))}
    </div>
  );
}