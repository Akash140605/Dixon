import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useProduction } from "../../../context/ProductionContext";
import {
  buildMachineRows,
  formatNumber,
  getHallLabelFromId,
  readLocalProductionData,
  slugifyMachineName,
  toNumber,
} from "../../../data/machineDataHelpers";

function getArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getHallAliases(hallId, hallLabel) {
  const normalizedId = normalizeValue(hallId);
  const normalizedLabel = normalizeValue(hallLabel);

  if (normalizedId === "c8" || normalizedLabel === "c8") {
    return ["c8", "hall 5", "h5"];
  }

  if (normalizedId === "hall-1" || normalizedLabel === "hall 1") {
    return ["hall 1", "h1", "hall-1"];
  }

  if (normalizedId === "hall-2" || normalizedLabel === "hall 2") {
    return ["hall 2", "h2", "hall-2"];
  }

  if (normalizedId === "hall-3" || normalizedLabel === "hall 3") {
    return ["hall 3", "h3", "hall-3"];
  }

  if (normalizedId === "hall-4" || normalizedLabel === "hall 4") {
    return ["hall 4", "h4", "hall-4"];
  }

  return [normalizedLabel, normalizedId.replace(/-/g, " ")].filter(Boolean);
}

function getEfficiencyConfig(value) {
  const efficiency = toNumber(value);

  if (efficiency >= 90) {
    return {
      text: "text-emerald-600",
      badge: "border-emerald-300 bg-emerald-50 text-emerald-700",
      dot: "bg-emerald-500",
      bar: "bg-emerald-600",
      panel: "bg-emerald-50",
      label: "Optimal",
      statusText: "Running well",
    };
  }

  if (efficiency >= 75) {
    return {
      text: "text-lime-600",
      badge: "border-lime-300 bg-lime-50 text-lime-700",
      dot: "bg-lime-500",
      bar: "bg-lime-600",
      panel: "bg-lime-50",
      label: "Stable",
      statusText: "Stable operation",
    };
  }

  return {
    text: "text-amber-600",
    badge: "border-amber-300 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    panel: "bg-amber-50",
    label: "Attention",
    statusText: "Needs attention",
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
    <div
      className={`rounded-[6px] border px-3 py-3 shadow-sm ${toneMap[tone] || toneMap.default}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-base font-bold tabular-nums">{value}</p>
    </div>
  );
}

function MetricCell({ label, value, valueClassName = "text-slate-900" }) {
  return (
    <div className="min-w-0 rounded-[4px] border border-slate-300 bg-white px-3 py-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-sm font-bold tabular-nums ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}

function MachineTile({ item, hallId }) {
  const efficiency = toNumber(item.efficiency);
  const config = getEfficiencyConfig(efficiency);
  const progressWidth = Math.max(0, Math.min(100, efficiency));

  return (
    <article className="group min-w-0 overflow-hidden rounded-[8px] border border-slate-300 bg-white shadow-sm transition-colors duration-200 hover:border-slate-400">
      <div className="h-1 bg-slate-300" />

      <div className="p-3">
        <div className="rounded-[6px] border border-slate-300 bg-slate-50">
          <div className="flex items-center justify-between gap-2 border-b border-slate-300 bg-slate-100 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 ${config.dot}`} />
              <span className="h-2.5 w-2.5 bg-slate-300" />
              <span className="h-2.5 w-2.5 bg-slate-300" />
            </div>

            <span className="shrink-0 rounded-[4px] border border-slate-300 bg-white px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
              Machine Unit
            </span>
          </div>

          <div className="p-3">
            <div className="rounded-[8px] border border-[#C7C4FF] bg-[#E8E7FF] px-3 py-3 shadow-sm">
              {" "}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#4338CA]">
                    Machine No.
                  </p>
                  <h2
                    className="mt-1 line-clamp-2 text-lg font-bold leading-6 tracking-tight text-[#231E5B]"
                    title={item.machine}
                  >
                    {item.machine}
                  </h2>
                </div>

                <span
                  className={`shrink-0 rounded-[4px] border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${config.badge}`}
                >
                  {config.label}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#4338CA]">
                    Efficiency
                  </p>
                  <p
                    className={`mt-1 text-[22px] font-bold leading-none tabular-nums ${config.text}`}
                  >
                    {efficiency.toFixed(1)}%
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#4338CA]">
                    Loss Minutes
                  </p>
                  <p className="mt-1 text-base font-bold tabular-nums text-amber-300">
                    {formatNumber(item.lossMinutes)}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden bg-[#231E5B]">
                <div
                  className={`h-full ${config.bar}`}
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
            </div>

            <div
              className={`mt-3 rounded-[6px] border border-slate-300 px-3 py-3 ${config.panel}`}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Part
                  </p>
                  <p
                    className="mt-1 line-clamp-2 min-h-[36px] text-xs font-semibold leading-4 text-slate-800"
                    title={item.part || "-"}
                  >
                    {item.part || "-"}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Operator
                  </p>
                  <p
                    className="mt-1 line-clamp-2 min-h-[36px] text-xs font-semibold leading-4 text-slate-800"
                    title={item.operator || "-"}
                  >
                    {item.operator || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <MetricCell label="Target" value={formatNumber(item.target)} />
              <MetricCell
                label="Actual"
                value={formatNumber(item.actual)}
                valueClassName="text-sky-700"
              />
              <MetricCell
                label="Good"
                value={formatNumber(item.good)}
                valueClassName="text-emerald-700"
              />
              <MetricCell
                label="Reject"
                value={formatNumber(item.reject)}
                valueClassName="text-rose-700"
              />
            </div>

            <div className="mt-3 flex items-center gap-3 rounded-[6px] border border-slate-300 bg-slate-100 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Status
                </p>
                <p
                  className="mt-1 truncate text-sm font-bold text-slate-800"
                  title={config.statusText}
                >
                  {config.statusText}
                </p>
              </div>

              <Link
                to={`/hall/${hallId}/machine/${slugifyMachineName(item.machine)}`}
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-[4px] border border-emerald-700 bg-emerald-700 px-3.5 text-[11px] font-semibold text-white transition hover:bg-emerald-800"
              >
                View Details
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="h-1 bg-slate-300" />
    </article>
  );
}

function EmptyState({ hallLabel }) {
  return (
    <section className="mt-6 rounded-[8px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto h-12 w-12 border border-slate-300 bg-slate-100" />

      <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">
        No machines found for {hallLabel}
      </h2>

      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
        Is hall ke liye abhi matching machine data available nahi mila.
      </p>

      <div className="mt-5">
        <Link
          to="/"
          className="inline-flex h-10 items-center justify-center rounded-[4px] border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back to Halls
        </Link>
      </div>
    </section>
  );
}

export default function HallMachinesView() {
  const { hallId } = useParams();
  const { machineHourlyTrend, filteredDashboardData } = useProduction();
  const localData = useMemo(() => readLocalProductionData(), []);

  const hallLabel = getHallLabelFromId(hallId);
  const hallAliases = useMemo(
    () => getHallAliases(hallId, hallLabel),
    [hallId, hallLabel],
  );

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

  const hallRows = useMemo(() => {
    return allRows.filter((row) => {
      const rowHall = normalizeValue(row.hall);
      return hallAliases.includes(rowHall);
    });
  }, [allRows, hallAliases]);

  const machineList = useMemo(() => {
    const grouped = {};

    hallRows.forEach((row) => {
      const key = row.machine || "Unknown Machine";

      if (!grouped[key]) {
        grouped[key] = {
          machine: key,
          part: row.part || "",
          operator: row.operator || "",
          actual: 0,
          good: 0,
          reject: 0,
          target: 0,
          lossMinutes: 0,
        };
      }

      grouped[key].actual += toNumber(row.actual);
      grouped[key].good += toNumber(row.good);
      grouped[key].reject += toNumber(row.reject);
      grouped[key].target += toNumber(row.target);
      grouped[key].lossMinutes += toNumber(row.lossMinutes);

      if (!grouped[key].part && row.part) grouped[key].part = row.part;
      if (!grouped[key].operator && row.operator)
        grouped[key].operator = row.operator;
    });

    return Object.values(grouped)
      .map((item) => ({
        ...item,
        efficiency: item.target > 0 ? (item.actual / item.target) * 100 : 0,
      }))
      .sort((a, b) => String(a.machine).localeCompare(String(b.machine)));
  }, [hallRows]);

  const summary = useMemo(() => {
    return machineList.reduce(
      (acc, item) => {
        acc.machines += 1;
        acc.target += toNumber(item.target);
        acc.actual += toNumber(item.actual);
        acc.good += toNumber(item.good);
        acc.reject += toNumber(item.reject);
        return acc;
      },
      {
        machines: 0,
        target: 0,
        actual: 0,
        good: 0,
        reject: 0,
      },
    );
  }, [machineList]);

  const hallEfficiency =
    summary.target > 0 ? (summary.actual / summary.target) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <main className="mx-auto max-w-[1800px] px-4 py-4 md:px-6 md:py-5 2xl:px-8">
        <section className="overflow-hidden rounded-[8px] border border-slate-300 bg-white shadow-sm">
         <div className="border-b border-slate-300 bg-[#231E5B] px-4 py-4 text-white md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Link to="/" className="transition hover:text-[#231E5B]">
                    Halls
                  </Link>
                  <span>/</span>
                  <span className="truncate text-[#231E5B]">{hallLabel}</span>
                </div>

                <h1 className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">
                  {hallLabel} Machines
                </h1>

                <p className="mt-1 max-w-2xl text-sm text-slate-300">
                  High-visibility machine cards with sharper corners and cleaner
                  industrial styling.
                </p>
              </div>

              <Link
                to="/"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-[4px] border border-slate-600 bg-[#231E5B] px-4 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Back
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 xl:grid-cols-6 md:p-5">
            <SummaryStat
              label="Machines"
              value={formatNumber(summary.machines)}
            />
            <SummaryStat label="Target" value={formatNumber(summary.target)} />
            <SummaryStat
              label="Actual"
              value={formatNumber(summary.actual)}
              tone="sky"
            />
            <SummaryStat
              label="Good"
              value={formatNumber(summary.good)}
              tone="emerald"
            />
            <SummaryStat
              label="Reject"
              value={formatNumber(summary.reject)}
              tone="rose"
            />
            <SummaryStat
              label="Hall Eff."
              value={`${hallEfficiency.toFixed(1)}%`}
              tone="amber"
            />
          </div>
        </section>

        {machineList.length ? (
          <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {machineList.map((item) => (
              <MachineTile key={item.machine} item={item} hallId={hallId} />
            ))}
          </section>
        ) : (
          <EmptyState hallLabel={hallLabel} />
        )}
      </main>
    </div>
  );
}
