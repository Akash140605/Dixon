import Topbar from "../components/layout/Topbar";
import FilterBar from "../components/layout/FilterBar";

import ProductionLineChart from "../components/layout/dashboard/ProductionLineChart";
import ShiftBarChart from "../components/layout/dashboard/ShiftBarChart";
import RejectionPieChart from "../components/layout/dashboard/RejectionPieChart";
import HourlyProductionTable from "../components/layout/dashboard/HourlyProductionTable";
import MachineHourlyChart from "../components/layout/dashboard/MachineHourlyChart";

import { useProduction } from "../context/ProductionContext";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

export default function Dashboard() {
  const {
    filteredDashboardData,
    machineHourlyTrend,
    hallWiseProduction,
    operatorWiseProduction,
  } = useProduction();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Topbar />

      <main className="min-w-0">
        <div className="space-y-6 p-4 md:p-6 xl:p-8">
          <FilterBar />

          <section className="grid grid-cols-1 gap-6 2xl:grid-cols-12 items-start">
            <div className="space-y-6 2xl:col-span-5">
              <ProductionLineChart data={filteredDashboardData?.dayWiseTrend || []} />
              <ShiftBarChart data={filteredDashboardData?.shiftWiseProduction || []} />
              <RejectionPieChart data={filteredDashboardData?.rejectionBreakdown || []} />
            </div>

            <div className="min-w-0 2xl:col-span-7">
              <div className="sticky top-4 space-y-6">
                <HourlyProductionTable rows={filteredDashboardData?.hourlyTable || []} />
              </div>
            </div>
          </section>

          <MachineHourlyChart machineHourlyTrend={machineHourlyTrend || []} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="border border-slate-300 bg-white p-5 md:p-6">
              <div className="mb-5">
                <h3 className="text-lg font-bold text-slate-900 md:text-xl">
                  Hall Wise Production
                </h3>
              </div>

              <div
                className="custom-scroll space-y-3 overflow-y-auto pr-1"
                style={{
                  height: "min(420px, 60vh)",
                  scrollbarWidth: "thin",
                }}
              >
                {hallWiseProduction.length > 0 ? (
                  hallWiseProduction.map((hall) => (
                    <div
                      key={hall.hall}
                      className="border border-slate-300 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-base font-bold text-slate-900">
                            {hall.hall}
                          </h4>
                          <p className="text-sm text-slate-600">
                            Target: {formatNumber(hall.target)} • Good: {formatNumber(hall.good)} • Reject: {formatNumber(hall.reject)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-slate-500">Actual</p>
                          <p className="text-lg font-bold text-sky-700 tabular-nums">
                            {formatNumber(hall.actual)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                    Koi hall-wise data available nahi hai.
                  </div>
                )}
              </div>
            </section>

            <section className="border border-slate-300 bg-white p-5 md:p-6">
              <div className="mb-5">
                <h3 className="text-lg font-bold text-slate-900 md:text-xl">
                  Operator Performance
                </h3>
              </div>

              <div
                className="custom-scroll space-y-3 overflow-y-auto pr-1"
                style={{
                  height: "min(420px, 60vh)",
                  scrollbarWidth: "thin",
                }}
              >
                {operatorWiseProduction.length > 0 ? (
                  operatorWiseProduction.map((operator) => (
                    <div
                      key={operator.operator}
                      className="border border-slate-300 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-base font-bold text-slate-900">
                            {operator.operator}
                          </h4>
                          <p className="text-sm text-slate-600">
                            Entries: {formatNumber(operator.entries)} • Good: {formatNumber(operator.good)} • Reject: {formatNumber(operator.reject)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-slate-500">Actual</p>
                          <p className="text-lg font-bold text-emerald-700 tabular-nums">
                            {formatNumber(operator.actual)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                    Koi operator data available nahi hai.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      <style>{`
        .custom-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: #e2e8f0;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #94a3b8;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  );
}