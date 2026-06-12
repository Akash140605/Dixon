import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

const initialFilters = {
  search: "",
  date: "",
  hall: "",
  machine: "",
  shift: "",
  rejectReason: "",
};

const REJECT_REASONS = [
  "Short Fill",
  "Power Cut",
  "Scratch",
  "Dent",
  "Black Dot",
  "Flow Mark",
  "Burn Mark",
  "Crack",
];

const normalizeShift = (value) => {
  const shift = String(value || "").trim().toUpperCase();

  if (!shift) return "";
  if (["A", "SHIFT A", "SHIFT 1", "1"].includes(shift)) return "A";
  if (["B", "SHIFT B", "SHIFT 2", "2"].includes(shift)) return "B";
  if (["C", "SHIFT C", "SHIFT 3", "3"].includes(shift)) return "C";

  return shift.replace("SHIFT ", "");
};

const normalizeDate = (value) => {
  if (!value) return "";
  const raw = String(value).trim();
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return raw;
};

const formatRejectBreakdown = (row) => {
  if (row.rejectBreakdownText) return String(row.rejectBreakdownText);

  if (Array.isArray(row.rejectBreakdown) && row.rejectBreakdown.length) {
    return row.rejectBreakdown.map((item) => `${item.reason}: ${item.qty}`).join(", ");
  }

  if (row.rejectReason) return String(row.rejectReason);
  return "";
};

const formatResponsiblePersons = (row) => {
  if (Array.isArray(row.lossTimeBreakdown) && row.lossTimeBreakdown.length) {
    return row.lossTimeBreakdown
      .map((item) =>
        item?.person
          ? item?.department
            ? `${item.person} (${item.department})`
            : item.person
          : ""
      )
      .filter(Boolean)
      .join(", ");
  }

  if (Array.isArray(row.responsibilities) && row.responsibilities.length) {
    return row.responsibilities
      .map((item) =>
        item?.department ? `${item.person} (${item.department})` : item.person || ""
      )
      .filter(Boolean)
      .join(", ");
  }

  if (row.responsibilitiesText) return String(row.responsibilitiesText);
  return "";
};

const formatLossTimeBreakdown = (row) => {
  if (row.lossTimeBreakdownText) return String(row.lossTimeBreakdownText);

  if (Array.isArray(row.lossTimeBreakdown) && row.lossTimeBreakdown.length) {
    return row.lossTimeBreakdown
      .map((item) => {
        const reason = item?.reason || "Unknown";
        const qty = Number(item?.qty || 0);
        const person = item?.person
          ? item?.department
            ? ` - ${item.person} (${item.department})`
            : ` - ${item.person}`
          : "";
        return `${reason}: ${qty}${person}`;
      })
      .join(", ");
  }

  return "";
};

const getReasonWiseRejects = (row) => {
  const base = REJECT_REASONS.reduce((acc, reason) => {
    acc[reason] = 0;
    return acc;
  }, {});

  if (Array.isArray(row.rejectBreakdown) && row.rejectBreakdown.length) {
    row.rejectBreakdown.forEach((item) => {
      const matchedReason = REJECT_REASONS.find(
        (reason) =>
          reason.toLowerCase() === String(item.reason || "").trim().toLowerCase()
      );
      if (matchedReason) {
        base[matchedReason] += Number(item.qty || 0);
      }
    });
    return base;
  }

  if (row.rejectReason) {
    const matchedReason = REJECT_REASONS.find(
      (reason) =>
        reason.toLowerCase() === String(row.rejectReason || "").trim().toLowerCase()
    );
    if (matchedReason) {
      base[matchedReason] = Number(row.reject || 0);
    }
  }

  return base;
};

const getReasonTotals = (rows) => {
  return rows.reduce(
    (acc, row) => {
      REJECT_REASONS.forEach((reason) => {
        acc[reason] += Number(row.reasonWiseRejects?.[reason] || 0);
      });
      return acc;
    },
    REJECT_REASONS.reduce((acc, reason) => {
      acc[reason] = 0;
      return acc;
    }, {})
  );
};

const getMachineDisplay = (row) => {
  if (typeof row.machine === "string" && row.machine.trim()) return row.machine;
  if (row.machine?.displayName) return row.machine.displayName;
  if (row.machineCode && row.machineName) return `${row.machineCode} - ${row.machineName}`;
  if (row.machineCode) return row.machineCode;
  return "";
};

export default function HourlyProductionTable({ rows = [] }) {
  const [filters, setFilters] = useState(initialFilters);

  const normalizedRows = useMemo(() => {
    return rows.map((row) => {
      const target = Number(row.target ?? 0);
      const actual = Number(row.actual ?? 0);
      const reject = Number(row.reject ?? 0);
      const good = Number(row.good ?? Math.max(actual - reject, 0));
      const lossTime = Number(
        row.lossTime ?? Math.max(target - actual, 0)
      );

      return {
        ...row,
        machineDisplay: getMachineDisplay(row),
        normalizedDate: normalizeDate(row.date),
        normalizedShift: normalizeShift(row.shiftLabel || row.shift),
        rejectBreakdownTextFormatted: formatRejectBreakdown(row),
        responsiblePersonsTextFormatted: formatResponsiblePersons(row),
        lossTimeBreakdownTextFormatted: formatLossTimeBreakdown(row),
        reasonWiseRejects: getReasonWiseRejects(row),
        target,
        actual,
        good,
        reject,
        lossTime,
        isNewOperator: Boolean(row.isNewOperator),
      };
    });
  }, [rows]);

  const uniqueOptions = useMemo(() => {
    const pick = (getter) => [...new Set(normalizedRows.map(getter).filter(Boolean))].sort();

    return {
      halls: pick((row) => row.hall),
      machines: pick((row) => row.machineDisplay),
      shifts: ["A", "B", "C"].filter((shift) =>
        normalizedRows.some((row) => row.normalizedShift === shift)
      ),
    };
  }, [normalizedRows]);

  const filteredRows = useMemo(() => {
    const searchText = filters.search.trim().toLowerCase();
    const filterDate = filters.date.trim().toLowerCase();
    const filterRejectReason = filters.rejectReason.trim().toLowerCase();

    return normalizedRows.filter((row) => {
      const date = String(row.normalizedDate || row.date || "").toLowerCase();
      const hall = String(row.hall || "").toLowerCase();
      const machine = String(row.machineDisplay || "").toLowerCase();
      const machineCode = String(row.machineCode || "").toLowerCase();
      const machineName = String(row.machineName || "").toLowerCase();
      const shift = String(row.normalizedShift || "").toLowerCase();
      const hour = String(row.hour || row.duration || "").toLowerCase();
      const part = String(row.part || "").toLowerCase();
      const operatorId = String(row.operatorId || "").toLowerCase();
      const operator = String(row.operator || "").toLowerCase();
      const rejectReason = String(row.rejectReason || "").toLowerCase();
      const rejectBreakdown = String(row.rejectBreakdownTextFormatted || "").toLowerCase();
      const lossTimeBreakdown = String(row.lossTimeBreakdownTextFormatted || "").toLowerCase();
      const responsiblePersons = String(row.responsiblePersonsTextFormatted || "").toLowerCase();
      const remarks = String(row.remarks || "").toLowerCase();
      const createdAt = String(row.createdAt || "").toLowerCase();
      const newOperatorStatus = row.isNewOperator ? "yes new operator" : "existing operator";

      const matchesSearch =
        !searchText ||
        [
          date,
          hall,
          machine,
          machineCode,
          machineName,
          shift,
          hour,
          part,
          operatorId,
          operator,
          rejectReason,
          rejectBreakdown,
          lossTimeBreakdown,
          responsiblePersons,
          remarks,
          createdAt,
          newOperatorStatus,
        ].some((value) => value.includes(searchText));

      const matchesDate = !filterDate || date.includes(filterDate);
      const matchesHall = !filters.hall || hall === filters.hall.toLowerCase();
      const matchesMachine =
        !filters.machine || machine === filters.machine.toLowerCase();
      const matchesShift = !filters.shift || shift === filters.shift.toLowerCase();
      const matchesRejectReason =
        !filterRejectReason ||
        rejectReason.includes(filterRejectReason) ||
        rejectBreakdown.includes(filterRejectReason);

      return (
        matchesSearch &&
        matchesDate &&
        matchesHall &&
        matchesMachine &&
        matchesShift &&
        matchesRejectReason
      );
    });
  }, [normalizedRows, filters]);

  const totals = useMemo(() => {
    const base = filteredRows.reduce(
      (acc, row) => {
        acc.target += row.target;
        acc.actual += row.actual;
        acc.good += row.good;
        acc.reject += row.reject;
        acc.lossTime += row.lossTime;
        return acc;
      },
      { target: 0, actual: 0, good: 0, reject: 0, lossTime: 0 }
    );

    return {
      ...base,
      reasonWiseRejects: getReasonTotals(filteredRows),
    };
  }, [filteredRows]);

  const rejectPercent =
    totals.actual > 0 ? ((totals.reject / totals.actual) * 100).toFixed(2) : "0.00";

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const exportToExcel = () => {
    if (!filteredRows.length) return;

    const excelData = filteredRows.map((row, index) => {
      const base = {
        "S.No": index + 1,
        Date: row.normalizedDate || row.date || "",
        Hall: row.hall || "",
        "Machine Display": row.machineDisplay || "",
        "Machine Code": row.machineCode || "",
        "Machine Name": row.machineName || "",
        Shift: row.normalizedShift || "",
        Hour: row.hour || row.duration || "",
        Part: row.part || "",
        "Operator ID": row.operatorId || "",
        Operator: row.operator || "",
        "New Operator": row.isNewOperator ? "Yes" : "No",
        Target: row.target ?? 0,
        Actual: row.actual ?? 0,
        Good: row.good ?? 0,
        Reject: row.reject ?? 0,
        "Loss Time": row.lossTime ?? 0,
      };

      REJECT_REASONS.forEach((reason) => {
        base[reason] = row.reasonWiseRejects?.[reason] ?? 0;
      });

      base["Reject Breakdown"] = row.rejectBreakdownTextFormatted || "";
      base["Loss Time Breakdown"] = row.lossTimeBreakdownTextFormatted || "";
      base["Responsible Persons"] = row.responsiblePersonsTextFormatted || "";
      base["Reject %"] =
        row.actual > 0 ? `${((row.reject / row.actual) * 100).toFixed(2)}%` : "0.00%";
      base.Remarks = row.remarks || "";
      base["Created At"] = row.createdAt || "";

      return base;
    });

    const summary = {
      "S.No": "",
      Date: "Summary",
      Hall: "",
      "Machine Display": "",
      "Machine Code": "",
      "Machine Name": "",
      Shift: "",
      Hour: "",
      Part: "",
      "Operator ID": "",
      Operator: "",
      "New Operator": "",
      Target: totals.target,
      Actual: totals.actual,
      Good: totals.good,
      Reject: totals.reject,
      "Loss Time": totals.lossTime,
      "Reject Breakdown": `Reject %: ${rejectPercent}%`,
      "Loss Time Breakdown": "",
      "Responsible Persons": "",
      "Reject %": `${rejectPercent}%`,
      Remarks: `Rows: ${filteredRows.length}`,
      "Created At": "",
    };

    REJECT_REASONS.forEach((reason) => {
      summary[reason] = totals.reasonWiseRejects[reason];
    });

    excelData.push({});
    excelData.push(summary);

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 14 },
      { wch: 14 },
      { wch: 24 },
      { wch: 14 },
      { wch: 18 },
      { wch: 8 },
      { wch: 16 },
      { wch: 22 },
      { wch: 16 },
      { wch: 18 },
      { wch: 14 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      ...REJECT_REASONS.map(() => ({ wch: 12 })),
      { wch: 32 },
      { wch: 36 },
      { wch: 28 },
      { wch: 12 },
      { wch: 24 },
      { wch: 22 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hourly Production");
    XLSX.writeFile(
      workbook,
      `hourly-production-report-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <section
        id="hourly-production-report"
        className="print-section border border-slate-300 bg-white p-4 md:p-6"
      >
        <div className="no-print mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex border border-slate-300 bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700">
              Production Analytics
            </div>
            <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
              Hourly Production Report
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Hall, machine, shift, part, operator, loss time aur reason-wise rejection reporting.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 xl:w-auto">
            <div className="flex min-h-[44px] items-center justify-center border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-700">
              Total Rows: {filteredRows.length}
            </div>

            <button
              type="button"
              onClick={exportToExcel}
              className="min-h-[44px] border border-emerald-800 bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!filteredRows.length}
            >
              Export Excel
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[44px] border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!filteredRows.length}
            >
              Print Table
            </button>
          </div>
        </div>

        <div className="no-print mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryCard label="Target" value={totals.target} tone="slate" />
          <SummaryCard label="Actual" value={totals.actual} tone="blue" />
          <SummaryCard label="Good" value={totals.good} tone="emerald" />
          <SummaryCard label="Reject" value={totals.reject} tone="rose" />
          <SummaryCard label="Loss Time" value={totals.lossTime} tone="amber" />
          <SummaryCard label="Reject %" value={`${rejectPercent}%`} tone="neutral" />
        </div>

        <div className="no-print mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          {REJECT_REASONS.map((reason) => (
            <SummaryCard
              key={reason}
              label={reason}
              value={totals.reasonWiseRejects[reason]}
              tone="neutral"
              compact
            />
          ))}
        </div>

        <div className="no-print mb-6 border border-slate-300 bg-slate-50 p-4">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-800">
                Filters
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Search and narrow production records quickly.
              </p>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="min-h-[42px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Clear Filters
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <FilterInput label="Search" className="xl:col-span-2">
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Machine, part, operator, loss time..."
                className="filter-input"
              />
            </FilterInput>

            <FilterInput label="Date">
              <input
                type="date"
                name="date"
                value={filters.date}
                onChange={handleFilterChange}
                className="filter-input"
              />
            </FilterInput>

            <FilterInput label="Hall">
              <select
                name="hall"
                value={filters.hall}
                onChange={handleFilterChange}
                className="filter-input"
              >
                <option value="">All Halls</option>
                {uniqueOptions.halls.map((hall) => (
                  <option key={hall} value={hall}>
                    {hall}
                  </option>
                ))}
              </select>
            </FilterInput>

            <FilterInput label="Machine">
              <select
                name="machine"
                value={filters.machine}
                onChange={handleFilterChange}
                className="filter-input"
              >
                <option value="">All Machines</option>
                {uniqueOptions.machines.map((machine) => (
                  <option key={machine} value={machine}>
                    {machine}
                  </option>
                ))}
              </select>
            </FilterInput>

            <FilterInput label="Shift">
              <select
                name="shift"
                value={filters.shift}
                onChange={handleFilterChange}
                className="filter-input"
              >
                <option value="">All Shifts</option>
                {uniqueOptions.shifts.map((shift) => (
                  <option key={shift} value={shift}>
                    {shift}
                  </option>
                ))}
              </select>
            </FilterInput>

            <FilterInput label="Reject Reason">
              <input
                type="text"
                name="rejectReason"
                value={filters.rejectReason}
                onChange={handleFilterChange}
                placeholder="Short Fill, Crack..."
                className="filter-input"
              />
            </FilterInput>
          </div>
        </div>

        <div className="table-scroll-wrap border border-slate-300 bg-white">
          <table className="printable-table min-w-[3200px] table-fixed text-sm">
            <thead className="print:bg-transparent">
              <tr className="border-b border-slate-400 text-slate-800">
                <TableHead className="w-[110px]">Date</TableHead>
                <TableHead className="w-[90px]">Hall</TableHead>
                <TableHead className="w-[160px]">Machine Display</TableHead>
                <TableHead className="w-[110px]">Machine Code</TableHead>
                <TableHead className="w-[140px]">Machine Name</TableHead>
                <TableHead className="w-[70px]">Shift</TableHead>
                <TableHead className="w-[120px]">Hour</TableHead>
                <TableHead className="w-[150px]">Part</TableHead>
                <TableHead className="w-[100px]">Operator ID</TableHead>
                <TableHead className="w-[140px]">Operator</TableHead>
                <TableHead className="w-[110px]">New Operator</TableHead>
                <TableHead className="w-[80px]">Target</TableHead>
                <TableHead className="w-[80px]">Actual</TableHead>
                <TableHead className="w-[80px]">Good</TableHead>
                <TableHead className="w-[80px]">Reject</TableHead>
                <TableHead className="w-[90px]">Loss Time</TableHead>

                {REJECT_REASONS.map((reason) => (
                  <TableHead key={reason} className="w-[95px]">
                    {reason}
                  </TableHead>
                ))}

                <TableHead className="w-[210px]">Reject Breakdown</TableHead>
                <TableHead className="w-[260px]">Loss Time Breakdown</TableHead>
                <TableHead className="w-[220px]">Responsible Persons</TableHead>
                <TableHead className="w-[100px]">Reject %</TableHead>
                <TableHead className="w-[180px]">Remarks</TableHead>
                <TableHead className="w-[170px]">Created At</TableHead>
              </tr>
            </thead>

            <tbody>
              {filteredRows.length > 0 ? (
                filteredRows.map((row, index) => {
                  const rowRejectPercent =
                    row.actual > 0 ? ((row.reject / row.actual) * 100).toFixed(2) : "0.00";

                  return (
                    <tr
                      key={row.id || `${row.date}-${row.machineDisplay}-${row.hour}-${index}`}
                      className="border-b border-slate-200 bg-white align-top hover:bg-slate-50 print:hover:bg-white"
                    >
                      <TableCell strong>{row.normalizedDate || row.date || "-"}</TableCell>
                      <TableCell>{row.hall || "-"}</TableCell>
                      <TableCell clamp>{row.machineDisplay || "-"}</TableCell>
                      <TableCell>{row.machineCode || "-"}</TableCell>
                      <TableCell clamp>{row.machineName || "-"}</TableCell>
                      <TableCell>
                        <span className="inline-flex border border-slate-400 bg-white px-2 py-1 text-xs font-bold text-slate-700 print:border-slate-300 print:bg-white print:text-slate-800">
                          {row.normalizedShift || "-"}
                        </span>
                      </TableCell>
                      <TableCell clamp>{row.hour || row.duration || "-"}</TableCell>
                      <TableCell clamp>{row.part || "-"}</TableCell>
                      <TableCell>{row.operatorId || "-"}</TableCell>
                      <TableCell clamp>{row.operator || "-"}</TableCell>
                      <TableCell>
                        <span className="inline-flex border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700">
                          {row.isNewOperator ? "Yes" : "No"}
                        </span>
                      </TableCell>
                      <TableCell strong>{row.target ?? 0}</TableCell>
                      <TableCell className="font-bold text-slate-900">{row.actual ?? 0}</TableCell>
                      <TableCell className="font-bold text-emerald-700 print:text-slate-900">
                        {row.good ?? 0}
                      </TableCell>
                      <TableCell className="font-bold text-rose-700 print:text-slate-900">
                        {row.reject ?? 0}
                      </TableCell>
                      <TableCell className="font-bold text-amber-700 print:text-slate-900">
                        {row.lossTime ?? 0}
                      </TableCell>

                      {REJECT_REASONS.map((reason) => (
                        <TableCell key={reason}>{row.reasonWiseRejects?.[reason] ?? 0}</TableCell>
                      ))}

                      <TableCell clamp>{row.rejectBreakdownTextFormatted || "-"}</TableCell>
                      <TableCell clamp>{row.lossTimeBreakdownTextFormatted || "-"}</TableCell>
                      <TableCell clamp>{row.responsiblePersonsTextFormatted || "-"}</TableCell>
                      <TableCell className="font-semibold text-amber-700 print:text-slate-900">
                        {rowRejectPercent}%
                      </TableCell>
                      <TableCell clamp muted>
                        {row.remarks || "-"}
                      </TableCell>
                      <TableCell clamp muted>
                        {row.createdAt || "-"}
                      </TableCell>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={22 + REJECT_REASONS.length} className="px-4 py-10 text-center">
                    <div className="border border-dashed border-slate-300 bg-slate-50 px-4 py-8">
                      <p className="text-sm font-semibold text-slate-700">
                        No production entries found
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Filter change karo ya new production entry add karo.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>

            {filteredRows.length > 0 && (
              <tfoot className="bg-slate-100">
                <tr className="border-t-2 border-slate-400 text-slate-900">
                  <td
                    colSpan="11"
                    className="px-4 py-3 text-right font-bold uppercase tracking-wide"
                  >
                    Total
                  </td>
                  <td className="px-4 py-3 font-bold">{totals.target}</td>
                  <td className="px-4 py-3 font-bold">{totals.actual}</td>
                  <td className="px-4 py-3 font-bold text-emerald-700">{totals.good}</td>
                  <td className="px-4 py-3 font-bold text-rose-700">{totals.reject}</td>
                  <td className="px-4 py-3 font-bold text-amber-700">{totals.lossTime}</td>

                  {REJECT_REASONS.map((reason) => (
                    <td key={reason} className="px-4 py-3 font-bold">
                      {totals.reasonWiseRejects[reason]}
                    </td>
                  ))}

                  <td className="px-4 py-3 font-semibold text-amber-700">
                    Reject %: {rejectPercent}%
                  </td>
                  <td className="px-4 py-3 text-slate-700">-</td>
                  <td className="px-4 py-3 text-slate-700">-</td>
                  <td className="px-4 py-3 font-semibold text-amber-700">{rejectPercent}%</td>
                  <td className="px-4 py-3 text-slate-700">Rows: {filteredRows.length}</td>
                  <td className="px-4 py-3 text-slate-700">-</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <style>{`
        .filter-input {
          width: 100%;
          min-width: 0;
          height: 44px;
          border-radius: 0;
          border: 1px solid rgb(148 163 184);
          background: white;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: rgb(30 41 59);
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .filter-input::placeholder {
          color: rgb(100 116 139);
        }

        .filter-input:focus {
          border-color: rgb(51 65 85);
          box-shadow: 0 0 0 2px rgb(226 232 240);
        }

        .table-scroll-wrap {
          width: 100%;
          max-width: 100%;
          overflow: auto;
          height: calc(100vh - 180px);
          min-height: 620px;
          max-height: 980px;
        }

        .line-clamp-2-custom {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.3rem;
          max-height: 2.6rem;
        }

        .table-cell-fixed {
          padding: 0.875rem 0.75rem;
          vertical-align: top;
          color: rgb(51 65 85);
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .printable-table thead th {
          position: sticky;
          top: 0;
          z-index: 2;
          background: rgb(226 232 240);
        }

        .printable-table tfoot td {
          position: sticky;
          bottom: 0;
          z-index: 1;
          background: rgb(241 245 249);
        }

        @media (max-width: 1280px) {
          .table-scroll-wrap {
            height: 760px;
            min-height: 520px;
            max-height: 760px;
          }
        }

        @media (max-width: 1024px) {
          .table-scroll-wrap {
            height: 620px;
            min-height: 420px;
            max-height: 620px;
          }
        }

        @media (max-width: 767px) {
          .table-scroll-wrap {
            height: 480px;
            min-height: 320px;
            max-height: 480px;
          }

          .table-cell-fixed {
            padding: 0.75rem 0.625rem;
          }
        }

        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }

          body * {
            visibility: hidden;
          }

          #hourly-production-report,
          #hourly-production-report * {
            visibility: visible;
          }

          #hourly-production-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            box-shadow: none !important;
            border: 0 !important;
            padding: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          .table-scroll-wrap {
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            border: 0 !important;
          }

          .printable-table {
            width: 100%;
            min-width: 100% !important;
            border-collapse: collapse;
            font-size: 10px;
          }

          .printable-table th,
          .printable-table td {
            border: 1px solid #94a3b8 !important;
            padding: 5px 6px !important;
            color: #000 !important;
            background: #fff !important;
            white-space: normal !important;
            position: static !important;
          }

          .printable-table span {
            border: 1px solid #94a3b8 !important;
            background: #fff !important;
            color: #000 !important;
          }

          .line-clamp-2-custom {
            display: block !important;
            max-height: none !important;
            overflow: visible !important;
          }
        }
      `}</style>
    </>
  );
}

function FilterInput({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function TableHead({ children, className = "" }) {
  return (
    <th
      scope="col"
      className={`px-3 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] ${className}`}
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
  className = "",
  strong = false,
  muted = false,
  clamp = false,
}) {
  return (
    <td
      className={[
        "table-cell-fixed",
        strong ? "font-semibold text-slate-800" : "",
        muted ? "text-slate-600" : "",
        className,
      ].join(" ")}
    >
      {clamp ? <div className="line-clamp-2-custom">{children}</div> : children}
    </td>
  );
}

function SummaryCard({ label, value, tone = "slate", compact = false }) {
  const toneMap = {
    slate: "border-slate-300 bg-white text-slate-900",
    blue: "border-slate-300 bg-white text-slate-900",
    emerald: "border-slate-300 bg-white text-emerald-700",
    rose: "border-slate-300 bg-white text-rose-700",
    amber: "border-slate-300 bg-white text-amber-700",
    neutral: "border-slate-300 bg-slate-50 text-slate-900",
  };

  return (
    <div
      className={[
        "border px-4 py-4",
        "flex min-h-[96px] flex-col justify-between",
        compact ? "min-h-[84px]" : "",
        toneMap[tone] || toneMap.slate,
      ].join(" ")}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className={`tabular-nums font-bold ${compact ? "text-lg" : "text-xl"}`}>
        {value}
      </p>
    </div>
  );
}