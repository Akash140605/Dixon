import { useMemo } from "react";
import {
  HOURLY_KEYS,
  HOURLY_FIELD_MAP,
  DEFAULT_PRODUCTION_DATE,
  formatNumber,
  buildMachineSummary,
  convertSummaryToHourlyTable,
  groupHourlyByMachine,
  buildDayWiseTrend,
} from "../utils/productionPlanParser";

const rawPlanRows = [
  {
    hall: "Hall-1",
    machineName: "Milacron 1300 T",
    partName: "Twin Tub",
    model: "T2",
    itemCode: "2DXTUB028737GR01",
    description: "TUB T2 GREY 8737",
    ct: 100,
    h08_09: 36,
    h09_10: 36,
    h10_11: 36,
    h11_12: 36,
    h12_13: 36,
    h13_14: 36,
    h14_15: 36,
    h15_16: 36,
    h16_17: 36,
    h17_18: 36,
    h18_19: 36,
    h19_20: 36,
    total: 432,
    actualTotal: 0,
    rejectionTotal: 0,
  },
  {
    hall: "Hall-1",
    machineName: "Super Master 408 T3",
    partName: "Pulsator",
    model: "T1",
    itemCode: "2DXPUL01SGREY001",
    description: "PULSATOR T1 7.5 KG GREY 8737",
    ct: 72,
    h08_09: 50,
    h09_10: 50,
    h10_11: 50,
    h11_12: 50,
    h12_13: 50,
    h13_14: 50,
    h14_15: 50,
    h15_16: 50,
    h16_17: 50,
    h17_18: 50,
    h18_19: 50,
    h19_20: 40,
    total: 590,
    actualTotal: 0,
    rejectionTotal: 0,
  },
  {
    hall: "Hall-3",
    machineName: "Super Master 1100T",
    partName: "Base",
    model: "B4",
    itemCode: "2DXBAS046570RE01",
    description: "BASE B4 M. RED 6570",
    ct: 80,
    h08_09: 45,
    h09_10: 45,
    h10_11: 45,
    h11_12: 45,
    h12_13: 45,
    h13_14: 45,
    h14_15: 45,
    h15_16: 45,
    h16_17: 45,
    h17_18: 45,
    h18_19: 45,
    h19_20: 45,
    total: 540,
    actualTotal: 70,
    rejectionTotal: 10,
  },
  {
    hall: "Hall-3",
    machineName: "Super Master 650 T1",
    partName: "Spin Tub",
    model: "T7",
    itemCode: "",
    description: "",
    ct: 60,
    h08_09: 60,
    h09_10: 60,
    h10_11: 60,
    h11_12: 60,
    h12_13: 60,
    h13_14: 60,
    h14_15: 60,
    h15_16: 60,
    h16_17: 60,
    h17_18: 60,
    h18_19: 60,
    h19_20: 60,
    total: 720,
    actualTotal: 76,
    rejectionTotal: 2,
  },
  {
    hall: "Hall-4",
    machineName: "Haitian 800 T",
    partName: "C. Table",
    model: "T7",
    itemCode: "2DXCTB078915BL01",
    description: "CONTROL TABLE T7B7 LYD BLACK 8915",
    ct: 65,
    h08_09: 55,
    h09_10: 55,
    h10_11: 55,
    h11_12: 55,
    h12_13: 55,
    h13_14: 55,
    h14_15: 55,
    h15_16: 55,
    h16_17: 55,
    h17_18: 55,
    h18_19: 55,
    h19_20: 55,
    total: 660,
    actualTotal: 103,
    rejectionTotal: 0,
  },
  {
    hall: "Hall-4",
    machineName: "Haitian 450 T6",
    partName: "Spin Lid Dixon",
    model: "T7",
    itemCode: "",
    description: "",
    ct: 90,
    h08_09: 40,
    h09_10: 40,
    h10_11: 40,
    h11_12: 40,
    h12_13: 40,
    h13_14: 40,
    h14_15: 40,
    h15_16: 40,
    h16_17: 40,
    h17_18: 40,
    h18_19: 40,
    h19_20: 40,
    total: 480,
    actualTotal: 79,
    rejectionTotal: 35,
  },
];

export default function ProductionPlanTable() {
  const summaryRows = useMemo(() => {
    return rawPlanRows.map((item) => buildMachineSummary(item));
  }, []);

  const hourlyTable = useMemo(() => {
    return convertSummaryToHourlyTable(summaryRows);
  }, [summaryRows]);

  const machineHourlyTrend = useMemo(() => {
    return groupHourlyByMachine(hourlyTable).map((machine) => {
      const totals = machine.data.reduce(
        (acc, row) => {
          acc.actual += row.actual;
          acc.good += row.good;
          acc.reject += row.reject;
          acc.target += row.target;
          acc.lossTime += row.lossTime;
          acc.lossMinutes += row.lossMinutes;
          return acc;
        },
        {
          actual: 0,
          good: 0,
          reject: 0,
          target: 0,
          lossTime: 0,
          lossMinutes: 0,
        }
      );

      return {
        ...machine,
        ...totals,
      };
    });
  }, [hourlyTable]);

  const dayWiseTrend = useMemo(() => {
    return buildDayWiseTrend(hourlyTable);
  }, [hourlyTable]);

  const totals = useMemo(() => {
    return summaryRows.reduce(
      (acc, row) => {
        acc.target += row.total;
        acc.actual += row.actualTotal;
        acc.reject += row.rejectionTotal;
        acc.achievementPercent = acc.target > 0 ? (acc.actual / acc.target) * 100 : 0;
        acc.rejectionPercent = acc.actual > 0 ? (acc.reject / acc.actual) * 100 : 0;
        return acc;
      },
      {
        target: 0,
        actual: 0,
        reject: 0,
        achievementPercent: 0,
        rejectionPercent: 0,
      }
    );
  }, [summaryRows]);

  return (
    <section className="border border-slate-300 bg-white p-4 md:p-6">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          Production Plan
        </p>
        <h2 className="mt-2 text-xl font-bold text-slate-900">
          Production Plan Sheet - {DEFAULT_PRODUCTION_DATE}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Safe calculations applied. No divide-by-zero. Blank hourly values treated as 0.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Total Target" value={formatNumber(totals.target)} />
        <StatCard label="Total Actual" value={formatNumber(totals.actual)} tone="blue" />
        <StatCard label="Total Reject" value={formatNumber(totals.reject)} tone="rose" />
        <StatCard
          label="Ach.%"
          value={`${totals.achievementPercent.toFixed(2)}%`}
          tone="emerald"
        />
        <StatCard
          label="Rej.%"
          value={`${totals.rejectionPercent.toFixed(2)}%`}
          tone="amber"
        />
      </div>

      <div className="overflow-auto border border-slate-300">
        <table className="min-w-[2200px] table-fixed border-collapse text-sm">
          <thead className="bg-slate-100">
            <tr>
              <Th>Hall</Th>
              <Th>Machine Name</Th>
              <Th>Part Name</Th>
              <Th>Model</Th>
              <Th>Item Code</Th>
              <Th>Description</Th>
              <Th>CT</Th>
              {HOURLY_KEYS.map((slot) => (
                <Th key={slot}>{slot}</Th>
              ))}
              <Th>Total Target</Th>
              <Th>Total Actual</Th>
              <Th>Total Reject</Th>
              <Th>Ach.%</Th>
              <Th>Rej.%</Th>
            </tr>
          </thead>

          <tbody>
            {summaryRows.map((row) => (
              <tr key={row.id} className="border-t border-slate-200">
                <Td>{row.hall}</Td>
                <Td>{row.machineName}</Td>
                <Td>{row.partName}</Td>
                <Td>{row.model}</Td>
                <Td>{row.itemCode || "-"}</Td>
                <Td>{row.description || "-"}</Td>
                <Td>{formatNumber(row.ct)}</Td>

                {HOURLY_KEYS.map((slot) => {
                  const field = HOURLY_FIELD_MAP[slot];
                  return <Td key={slot}>{formatNumber(row[field])}</Td>;
                })}

                <Td strong>{formatNumber(row.total)}</Td>
                <Td strong blue>{formatNumber(row.actualTotal)}</Td>
                <Td strong rose>{formatNumber(row.rejectionTotal)}</Td>
                <Td strong emerald>{row.achievementPercent.toFixed(2)}%</Td>
                <Td strong amber>{row.rejectionPercent.toFixed(2)}%</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="border border-slate-300 p-4">
          <h3 className="text-base font-bold text-slate-900">Machine Hourly Trend Preview</h3>
          <p className="mt-1 text-sm text-slate-600">
            This data is ready for machine-wise chart components.
          </p>

          <pre className="mt-3 overflow-auto bg-slate-50 p-3 text-xs text-slate-700">
            {JSON.stringify(machineHourlyTrend.slice(0, 2), null, 2)}
          </pre>
        </div>

        <div className="border border-slate-300 p-4">
          <h3 className="text-base font-bold text-slate-900">Day Wise Trend Preview</h3>
          <p className="mt-1 text-sm text-slate-600">
            This data is ready for day-wise trend charts.
          </p>

          <pre className="mt-3 overflow-auto bg-slate-50 p-3 text-xs text-slate-700">
            {JSON.stringify(dayWiseTrend, null, 2)}
          </pre>
        </div>
      </div>
    </section>
  );
}

function Th({ children }) {
  return (
    <th className="border border-slate-300 px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-700">
      {children}
    </th>
  );
}

function Td({ children, strong = false, blue = false, rose = false, emerald = false, amber = false }) {
  const colorClass = blue
    ? "text-sky-700"
    : rose
    ? "text-rose-700"
    : emerald
    ? "text-emerald-700"
    : amber
    ? "text-amber-700"
    : "text-slate-700";

  return (
    <td
      className={`border border-slate-200 px-3 py-2 align-top ${
        strong ? "font-bold" : "font-medium"
      } ${colorClass}`}
    >
      {children}
    </td>
  );
}

function StatCard({ label, value, tone = "slate" }) {
  const toneMap = {
    slate: "text-slate-900 bg-white",
    blue: "text-sky-700 bg-sky-50",
    rose: "text-rose-700 bg-rose-50",
    emerald: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-700 bg-amber-50",
  };

  return (
    <div className={`border border-slate-300 px-4 py-4 ${toneMap[tone] || toneMap.slate}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}