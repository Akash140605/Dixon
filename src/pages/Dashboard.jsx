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
    <section className={compact ? "space-y-3" : "space-y-4"}>
      {(title || subtitle) && (
        <div className="flex flex-col gap-2">
          {title ? (
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-950 md:text-lg">
              {title}
            </h2>
          ) : null}

          {subtitle ? (
            <p className="max-w-3xl text-sm leading-5 text-slate-500">
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
      className={`min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${
        padded ? "p-4 md:p-5" : ""
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-[26px] font-semibold tracking-tight tabular-nums ${
          toneMap[tone] || toneMap.default
        }`}
      >
        {value}
      </p>

      {helper ? (
        <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
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
}) {
  return (
    <Panel padded>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">
            Production Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Consolidated production performance, trends, diagnostics, and operational summaries.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
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

export default function Dashboard() {
  const {
    filteredDashboardData,
    machineHourlyTrend,
    hallWiseProduction,
    operatorWiseProduction,
  } = useProduction();

  const summary = filteredDashboardData?.summary || {};

  const dayWiseTrend = safeArray(filteredDashboardData?.dayWiseTrend);
  const shiftWiseData = safeArray(filteredDashboardData?.shiftWiseProduction);
  const hourlyRows = safeArray(filteredDashboardData?.hourlyTable);

  const hallData = safeArray(hallWiseProduction);
  const operatorData = safeArray(operatorWiseProduction);
  const machineTrendData = safeArray(machineHourlyTrend);

  const totalTarget = toNumber(
    summary.targetProduction ?? summary.totalTarget ?? summary.target,
  );

  const totalActual = toNumber(
    summary.totalProduction ?? summary.totalActual ?? summary.actual,
  );

  const totalGood = toNumber(
    summary.goodProduction ?? summary.totalGood ?? summary.good,
  );

  const totalReject = toNumber(
    summary.rejection ?? summary.totalReject ?? summary.reject,
  );

  const totalLossQty = toNumber(
    summary.lossQty ??
      summary.totalLoss ??
      summary.lossTime ??
      summary.productionLoss,
  );

  const totalLossMinutes = toNumber(
    summary.lossMinutes ??
      summary.totalLossMinutes ??
      summary.lossTimeMinutes,
  );

  const overallAchievement =
    totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

  const overallRejectRate =
    totalActual > 0 ? (totalReject / totalActual) * 100 : 0;

  const overallGoodRate =
    totalActual > 0 ? (totalGood / totalActual) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-slate-100/95 backdrop-blur supports-[backdrop-filter]:bg-slate-100/80">
        <div className="mx-auto w-full max-w-[1920px] px-4 py-3 md:px-6 2xl:px-8">
          <FilterBar />
        </div>
      </div>

      <main className="min-w-0">
        <div className="mx-auto w-full max-w-[1920px] space-y-6 px-4 py-4 md:px-6 md:py-5 2xl:px-8">
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
          />

          <DashboardSection
            title="Hall Navigation"
            subtitle="Select one of the 5 halls to drill down into machine-level details."
          >
            <HallCardsView
              machineHourlyTrend={machineTrendData}
              hourlyRows={hourlyRows}
              limit={5}
            />
          </DashboardSection>

          <DashboardSection
            title="Production Trend"
            subtitle="Daily production trend for the selected period."
          >
            <Panel className="w-full" padded>
              <ProductionLineChart data={dayWiseTrend} />
            </Panel>
          </DashboardSection>

          <DashboardSection
            title="Operational Diagnostics"
            subtitle="Shift analysis, rejection, loss, and comparative operational insights."
          >
            <div className="space-y-6">
              <Panel className="w-full" padded>
                <ShiftBarChart data={shiftWiseData} />
              </Panel>

              <Panel className="w-full" padded>
                <ProductionInsightsChart
                  hourlyTable={hourlyRows}
                  machineHourlyTrend={machineTrendData}
                  shiftWiseProduction={shiftWiseData}
                  dayWiseTrend={dayWiseTrend}
                />
              </Panel>
            </div>
          </DashboardSection>

          <DashboardSection
            title="Hourly Production Table"
            subtitle="Detailed production records for the selected view."
          >
            <Panel className="w-full" padded>
              <HourlyProductionTable rows={hourlyRows} />
            </Panel>
          </DashboardSection>

          <DashboardSection
            title="Machine Hourly Analysis"
            subtitle="Machine-wise hourly production trends and operational comparison."
          >
            <Panel className="w-full" padded>
              <MachineHourlyChart machineHourlyTrend={machineTrendData} />
            </Panel>
          </DashboardSection>

          <DashboardSection
            title="Performance Summary"
            subtitle="Hall-level and operator-level performance overview."
          >
            <div className="space-y-6">
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
        </div>
      </main>
    </div>
  );
}