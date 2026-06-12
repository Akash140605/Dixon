import Topbar from "../components/layout/Topbar";
import FilterBar from "../components/layout/FilterBar";

import ProductionLineChart from "../components/layout/dashboard/ProductionLineChart";
import ShiftBarChart from "../components/layout/dashboard/ShiftBarChart";
import RejectionPieChart from "../components/layout/dashboard/RejectionPieChart";
import HourlyProductionTable from "../components/layout/dashboard/HourlyProductionTable";
import MachineHourlyChart from "../components/layout/dashboard/MachineHourlyChart";
import ProductionInsightsChart from "../components/layout/dashboard/HourlyComparisonChart";

import { useProduction } from "../context/ProductionContext";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function calculateAchievement(actual, target) {
  if (!Number(target)) return 0;
  return (Number(actual || 0) / Number(target || 0)) * 100;
}

function calculateRejectRate(reject, actual) {
  if (!Number(actual)) return 0;
  return (Number(reject || 0) / Number(actual || 0)) * 100;
}

function calculateGoodRate(good, actual) {
  if (!Number(actual)) return 0;
  return (Number(good || 0) / Number(actual || 0)) * 100;
}

function KpiCard({ label, value, tone = "default", hint }) {
  const toneMap = {
    default: {
      value: "text-slate-900",
      chip: "bg-slate-50 text-slate-600 border-slate-200",
    },
    sky: {
      value: "text-sky-700",
      chip: "bg-sky-50 text-sky-700 border-sky-200",
    },
    emerald: {
      value: "text-emerald-700",
      chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    rose: {
      value: "text-rose-700",
      chip: "bg-rose-50 text-rose-700 border-rose-200",
    },
  };

  const styles = toneMap[tone] || toneMap.default;

  return (
    <div className="border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>
          <p className={`mt-2 text-2xl font-bold tabular-nums ${styles.value}`}>
            {value}
          </p>
        </div>

        {hint ? (
          <span className={`border px-2.5 py-1 text-[11px] font-semibold ${styles.chip}`}>
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function PerformanceCard({
  title,
  subtitle,
  countLabel,
  items = [],
  type = "hall",
}) {
  const isHall = type === "hall";

  return (
    <section className="border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 md:text-xl">
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>

        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          {countLabel}
        </div>
      </div>

      <div
        className="custom-scroll space-y-4 overflow-y-auto pr-1"
        style={{ height: "min(460px, 62vh)", scrollbarWidth: "thin" }}
      >
        {items.length > 0 ? (
          [...items]
            .sort((a, b) => Number(b.actual || 0) - Number(a.actual || 0))
            .map((item, index) => {
              const name = isHall
                ? item.hall || "Unknown Hall"
                : item.operator || "Unknown Operator";

              const achievement = calculateAchievement(item.actual, item.target);
              const rejectRate = calculateRejectRate(item.reject, item.actual);
              const goodRate = calculateGoodRate(item.good, item.actual);

              const primaryRate = isHall ? achievement : goodRate;
              const primaryLabel = isHall ? "Target Achievement" : "Good Output Ratio";
              const primaryValue = isHall ? achievement.toFixed(1) : goodRate.toFixed(1);
              const primaryBarColor = isHall
                ? achievement >= 100
                  ? "bg-emerald-600"
                  : "bg-sky-600"
                : "bg-emerald-600";

              return (
                <div
                  key={`${name}-${index}`}
                  className="border border-slate-200 bg-slate-50 p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h4 className="text-base font-bold text-slate-900">
                          {name}
                        </h4>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {!isHall ? (
                            <span className="border border-slate-200 bg-white px-2 py-1 text-slate-600">
                              Entries:{" "}
                              <span className="font-semibold tabular-nums">
                                {formatNumber(item.entries)}
                              </span>
                            </span>
                          ) : null}

                          {isHall ? (
                            <span className="border border-slate-200 bg-white px-2 py-1 text-slate-600">
                              Target:{" "}
                              <span className="font-semibold tabular-nums">
                                {formatNumber(item.target)}
                              </span>
                            </span>
                          ) : null}

                          <span className="border border-slate-200 bg-white px-2 py-1 text-slate-600">
                            Good:{" "}
                            <span className="font-semibold tabular-nums">
                              {formatNumber(item.good)}
                            </span>
                          </span>

                          <span className="border border-slate-200 bg-white px-2 py-1 text-slate-600">
                            Reject:{" "}
                            <span className="font-semibold tabular-nums">
                              {formatNumber(item.reject)}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-xs text-slate-500">Actual</p>
                        <p
                          className={`text-xl font-bold tabular-nums ${
                            isHall ? "text-sky-700" : "text-emerald-700"
                          }`}
                        >
                          {formatNumber(item.actual)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="border border-slate-200 bg-white p-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          {isHall ? "Achievement" : "Good Rate"}
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900 tabular-nums">
                          {(isHall ? achievement : goodRate).toFixed(1)}%
                        </p>
                      </div>

                      <div className="border border-slate-200 bg-white p-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          Reject Rate
                        </p>
                        <p className="mt-1 text-sm font-bold text-rose-700 tabular-nums">
                          {rejectRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                        <span>{primaryLabel}</span>
                        <span className="tabular-nums">{primaryValue}%</span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-all ${primaryBarColor}`}
                          style={{ width: `${Math.min(primaryRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
        ) : (
          <div className="border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            {isHall
              ? "Koi hall-wise data available nahi hai."
              : "Koi operator data available nahi hai."}
          </div>
        )}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const {
    filteredDashboardData,
    machineHourlyTrend,
    hallWiseProduction,
    operatorWiseProduction,
  } = useProduction();

  const summary = filteredDashboardData?.summary || {};
  const dayWiseTrend = filteredDashboardData?.dayWiseTrend || [];
  const shiftWiseData = filteredDashboardData?.shiftWiseProduction || [];
  const rejectionBreakdown = filteredDashboardData?.rejectionBreakdown || [];
  const hourlyRows = filteredDashboardData?.hourlyTable || [];

  const hallData = hallWiseProduction || [];
  const operatorData = operatorWiseProduction || [];
  const machineTrendData = machineHourlyTrend || [];

  const totalTarget = Number(summary.targetProduction || 0);
  const totalActual = Number(summary.totalProduction || 0);
  const totalGood = Number(summary.goodProduction || 0);
  const totalReject = Number(summary.rejection || 0);

  const overallAchievement =
    totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
  const overallRejectRate =
    totalActual > 0 ? (totalReject / totalActual) * 100 : 0;
  const overallGoodRate =
    totalActual > 0 ? (totalGood / totalActual) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Topbar />

      <main className="min-w-0">
        <div className="space-y-6 p-4 md:p-6 xl:p-8">
          <FilterBar />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              label="Total Target"
              value={formatNumber(totalTarget)}
              hint="Planned"
            />
            <KpiCard
              label="Total Actual"
              value={formatNumber(totalActual)}
              tone="sky"
              hint="Produced"
            />
            <KpiCard
              label="Total Good"
              value={formatNumber(totalGood)}
              tone="emerald"
              hint={`${overallGoodRate.toFixed(1)}%`}
            />
            <KpiCard
              label="Achievement"
              value={`${overallAchievement.toFixed(1)}%`}
              tone="emerald"
              hint="Against target"
            />
            <KpiCard
              label="Reject Rate"
              value={`${overallRejectRate.toFixed(1)}%`}
              tone="rose"
              hint={formatNumber(totalReject)}
            />
          </section>

          <section className="grid grid-cols-1 gap-6 2xl:grid-cols-12 items-start">
            <div className="space-y-6 2xl:col-span-5">
              <ProductionLineChart data={dayWiseTrend} />
              <ShiftBarChart data={shiftWiseData} />
              <RejectionPieChart data={rejectionBreakdown} />
            </div>

            <div className="min-w-0 space-y-6 2xl:col-span-7">
              <HourlyProductionTable rows={hourlyRows} />

              <ProductionInsightsChart
                hourlyTable={hourlyRows}
                machineHourlyTrend={machineTrendData}
                shiftWiseProduction={shiftWiseData}
                dayWiseTrend={dayWiseTrend}
              />
            </div>
          </section>

          <MachineHourlyChart machineHourlyTrend={machineTrendData} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <PerformanceCard
              title="Hall Wise Performance"
              subtitle="Hall target, output aur quality ka clean overview."
              countLabel={`${hallData.length} halls`}
              items={hallData}
              type="hall"
            />

            <PerformanceCard
              title="Operator Performance"
              subtitle="Operator output aur quality ka simplified overview."
              countLabel={`${operatorData.length} operators`}
              items={operatorData}
              type="operator"
            />
          </div>
        </div>
      </main>

      <style>{`
        .custom-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scroll::-webkit-scrollbar-track {
          background: #e2e8f0;
          border-radius: 9999px;
        }

        .custom-scroll::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 9999px;
        }

        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  );
}