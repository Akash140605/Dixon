import { useEffect, useRef, useState } from "react";
import FilterBar from "../components/layout/FilterBar";

import ProductionLineChart from "../components/layout/dashboard/ProductionLineChart";
import ShiftBarChart from "../components/layout/dashboard/ShiftBarChart";
import HourlyProductionTable from "../components/layout/dashboard/HourlyProductionTable";
import MachineHourlyChart from "../components/layout/dashboard/MachineHourlyChart";
import ProductionInsightsChart from "../components/layout/dashboard/HourlyComparisonChart";
import HallPerformanceCard from "../components/layout/dashboard/HallPerformaceCard";
import OperatorPerformancePanel from "../components/layout/dashboard/OperatorPerformancePanel";
import HallCardsView from "../components/layout/dashboard/HallCardsView";

import { useProduction } from "../context/ProductionContext";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function DashboardSection({ title, subtitle, children, compact = false }) {
  return (
    <section className={compact ? "space-y-2" : "space-y-3"}>
      {(title || subtitle) && (
        <div className="flex min-w-0 flex-col gap-1">
          {title ? (
            <h2 className="text-sm font-semibold tracking-tight text-slate-950 md:text-base">
              {title}
            </h2>
          ) : null}

          {subtitle ? (
            <p className="max-w-3xl text-xs leading-5 text-slate-500 md:text-sm">
              {subtitle}
            </p>
          ) : null}
        </div>
      )}

      {children}
    </section>
  );
}

function Panel({ className = "", children, padded = false }) {
  return (
    <section
      className={`min-w-0 overflow-hidden rounded-none border border-slate-300 bg-white shadow-none ${
        padded ? "p-2 sm:p-3 md:p-4" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

function KpiCard({ label, value, tone = "default", helper }) {
  const toneMap = {
    default: "text-slate-950",
    sky: "text-sky-700",
    emerald: "text-emerald-700",
    rose: "text-rose-700",
    violet: "text-violet-700",
    amber: "text-amber-700",
  };

  return (
    <div className="min-w-0 rounded-none border border-slate-300 bg-white p-2.5 sm:p-3 shadow-none">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 truncate text-xl font-semibold tracking-tight tabular-nums sm:text-[22px] md:text-2xl ${
          toneMap[tone] || toneMap.default
        }`}
      >
        {value}
      </p>

      {helper ? (
        <p className="mt-1 text-[11px] font-medium text-slate-500">{helper}</p>
      ) : null}
    </div>
  );
}

function MetricsHeader({
  totalTarget,
  totalActual,
  totalGood,
  totalReject,
  totalLossQty,
  totalLossMinutes,
  overallAchievement,
  overallRejectRate,
  overallGoodRate,
  onRefresh,
  refreshing,
}) {
  return (
    <Panel padded>
      <div className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-slate-950 sm:text-lg md:text-xl">
              Production Dashboard
            </h1>
            <p className="mt-1 text-xs text-slate-500 md:text-sm">
              Consolidated production performance, trends, diagnostics, and operational summaries.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex h-9 w-full items-center justify-center rounded-none border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-6">
          <KpiCard
            label="Total Target"
            value={formatNumber(totalTarget)}
            helper="Planned production"
          />

          <KpiCard
            label="Total Actual"
            value={formatNumber(totalActual)}
            tone="sky"
            helper={`Achievement: ${overallAchievement.toFixed(1)}%`}
          />

          <KpiCard
            label="Good Output"
            value={formatNumber(totalGood)}
            tone="emerald"
            helper={`Good rate: ${overallGoodRate.toFixed(1)}%`}
          />

          <KpiCard
            label="Total Reject"
            value={formatNumber(totalReject)}
            tone="rose"
            helper={`Reject rate: ${overallRejectRate.toFixed(1)}%`}
          />

          <KpiCard
            label="Loss Quantity"
            value={formatNumber(totalLossQty)}
            tone="violet"
            helper="Production gap"
          />

          <KpiCard
            label="Loss Minutes"
            value={formatNumber(totalLossMinutes)}
            tone="amber"
            helper="Downtime"
          />
        </div>
      </div>
    </Panel>
  );
}

function DashboardState({ loading, error, onRetry }) {
  if (loading) {
    return (
      <div className="rounded-none border border-slate-300 bg-white p-4 text-sm text-slate-600">
        Loading dashboard data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-none border border-rose-300 bg-rose-50 p-4">
        <p className="text-sm font-medium text-rose-700">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex h-9 items-center justify-center rounded-none border border-rose-700 bg-rose-600 px-3 text-sm font-medium text-white transition hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}

export default function Dashboard() {
  const {
    filteredDashboardData,
    machineHourlyTrend,
    hallWiseProduction,
    operatorWiseProduction,
    loading,
    error,
    refreshEntries,
  } = useProduction();

  const filterBarRef = useRef(null);
  const [topOffset, setTopOffset] = useState(72);

  useEffect(() => {
    const el = filterBarRef.current;
    if (!el) return;

    const updateHeight = () => {
      const nextHeight = el.getBoundingClientRect().height;
      setTopOffset(nextHeight || 72);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    window.addEventListener("resize", updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  const summary = filteredDashboardData?.summary || {};

  const dayWiseTrend = safeArray(filteredDashboardData?.dayWiseTrend);
  const shiftWiseData = safeArray(filteredDashboardData?.shiftWiseProduction);
  const hourlyRows = safeArray(filteredDashboardData?.hourlyTable);

  const hallData = safeArray(hallWiseProduction);
  const operatorData = safeArray(operatorWiseProduction);
  const machineTrendData = safeArray(machineHourlyTrend);

  const totalTarget = toNumber(
    summary.targetProduction ?? summary.totalTarget ?? summary.target
  );

  const totalActual = toNumber(
    summary.totalProduction ?? summary.totalActual ?? summary.actual
  );

  const totalGood = toNumber(
    summary.goodProduction ?? summary.totalGood ?? summary.good
  );

  const totalReject = toNumber(
    summary.rejection ?? summary.totalReject ?? summary.reject
  );

  const totalLossQty = toNumber(
    summary.lossQty ??
      summary.totalLoss ??
      summary.lossTime ??
      summary.productionLoss
  );

  const totalLossMinutes = toNumber(
    summary.lossMinutes ??
      summary.totalLossMinutes ??
      summary.lossTimeMinutes
  );

  const overallAchievement =
    totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

  const overallRejectRate =
    totalActual > 0 ? (totalReject / totalActual) * 100 : 0;

  const overallGoodRate =
    totalActual > 0 ? (totalGood / totalActual) * 100 : 0;

  const handleRefresh = async () => {
    try {
      await refreshEntries();
    } catch {
      // context already handles this
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div ref={filterBarRef} className="fixed inset-x-0 top-0 z-50">
        <FilterBar />
      </div>

      <main
        className="min-w-0"
        style={{ paddingTop: `${topOffset}px` }}
      >
        <div className="mx-auto w-full max-w-[1920px] space-y-3 px-2 py-2 sm:px-3 sm:py-3 lg:px-4">
          <MetricsHeader
            totalTarget={totalTarget}
            totalActual={totalActual}
            totalGood={totalGood}
            totalReject={totalReject}
            totalLossQty={totalLossQty}
            totalLossMinutes={totalLossMinutes}
            overallAchievement={overallAchievement}
            overallRejectRate={overallRejectRate}
            overallGoodRate={overallGoodRate}
            onRefresh={handleRefresh}
            refreshing={loading}
          />

          <DashboardState
            loading={loading && hourlyRows.length === 0}
            error={error}
            onRetry={handleRefresh}
          />

          {!error && (
            <>
              <DashboardSection
                title="Hall Navigation"
                subtitle="Select one of the 5 halls to drill down into machine-level details."
                compact
              >
                <div className="min-w-0 overflow-hidden">
                  <HallCardsView
                    machineHourlyTrend={machineTrendData}
                    hourlyRows={hourlyRows}
                    limit={5}
                  />
                </div>
              </DashboardSection>

              <DashboardSection
                title="Production Trend"
                subtitle="Daily production trend for the selected period."
              >
                <Panel className="w-full">
                  <div className="min-w-0 overflow-x-auto p-2 sm:p-3 md:p-4">
                    <ProductionLineChart data={dayWiseTrend} />
                  </div>
                </Panel>
              </DashboardSection>

              <DashboardSection
                title="Operational Diagnostics"
                subtitle="Shift analysis, rejection, loss, and comparative operational insights."
              >
                <div className="space-y-3">
                  <Panel className="w-full">
                    <div className="min-w-0 overflow-x-auto p-2 sm:p-3 md:p-4">
                      <ShiftBarChart data={shiftWiseData} />
                    </div>
                  </Panel>

                  <Panel className="w-full">
                    <div className="min-w-0 overflow-x-auto p-2 sm:p-3 md:p-4">
                      <ProductionInsightsChart
                        hourlyTable={hourlyRows}
                        machineHourlyTrend={machineTrendData}
                        shiftWiseProduction={shiftWiseData}
                        dayWiseTrend={dayWiseTrend}
                      />
                    </div>
                  </Panel>
                </div>
              </DashboardSection>

              <DashboardSection
                title="Hourly Production Table"
                subtitle="Detailed production records for the selected view."
              >
                <Panel className="w-full">
                  <div className="min-w-0 overflow-x-auto">
                    <div className="min-w-[720px] p-2 sm:p-3 md:p-4">
                      <HourlyProductionTable rows={hourlyRows} />
                    </div>
                  </div>
                </Panel>
              </DashboardSection>

              <DashboardSection
                title="Machine Hourly Analysis"
                subtitle="Machine-wise hourly production trends and operational comparison."
              >
                <Panel className="w-full">
                  <div className="min-w-0 overflow-x-auto p-2 sm:p-3 md:p-4">
                    <MachineHourlyChart machineHourlyTrend={machineTrendData} />
                  </div>
                </Panel>
              </DashboardSection>

              <DashboardSection
                title="Performance Summary"
                subtitle="Hall-level and operator-level performance overview."
              >
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  <Panel className="w-full" padded>
                    <HallPerformanceCard
                      title="Hall Performance"
                      subtitle="Target, actual, good output, and loss by hall."
                      countLabel={`${hallData.length} halls`}
                      items={hallData}
                    />
                  </Panel>

                  <Panel className="w-full" padded>
                    <OperatorPerformancePanel items={operatorData} />
                  </Panel>
                </div>
              </DashboardSection>
            </>
          )}
        </div>
      </main>
    </div>
  );
}