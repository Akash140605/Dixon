import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaPlus, FaSlidersH, FaTimes } from "react-icons/fa";
import { halls, machineMap, shifts } from "../../data/formData";
import { useProduction } from "../../context/ProductionContext";

const getMachineCode = (machine) => {
  if (typeof machine === "string") return machine;
  return machine?.code || "";
};

const getMachineLabel = (machine) => {
  if (typeof machine === "string") return machine;
  return machine?.displayName || machine?.name || machine?.code || "";
};

const getAllMachines = () => {
  return Object.values(machineMap).flat().filter(Boolean);
};

function FilterField({ label, children }) {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function ActiveChip({ children }) {
  return (
    <span className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-medium text-slate-600">
      {children}
    </span>
  );
}

export default function FilterBar() {
  const { filters, setFilters, resetFilters } = useProduction();
  const [mobileOpen, setMobileOpen] = useState(false);

  const machineOptions = useMemo(() => {
    const rawMachines = filters.hall
      ? machineMap[filters.hall] || []
      : getAllMachines();

    const uniqueMachines = [];
    const seen = new Set();

    rawMachines.forEach((machine) => {
      const code = getMachineCode(machine);
      if (!code || seen.has(code)) return;
      seen.add(code);
      uniqueMachines.push(machine);
    });

    return uniqueMachines;
  }, [filters.hall]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "hall") {
      setFilters((prev) => ({
        ...prev,
        hall: value,
        machine: "",
      }));
      return;
    }

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleReset = () => {
    resetFilters();
    setMobileOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const inputClass =
    "h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

  const activeFilterCount = [
    filters.date,
    filters.hall,
    filters.shift,
    filters.machine,
    filters.operator,
  ].filter(Boolean).length;

  const FilterFields = () => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <FilterField label="Date">
        <input
          type="date"
          name="date"
          value={filters.date || ""}
          onChange={handleChange}
          className={inputClass}
        />
      </FilterField>

      <FilterField label="Hall">
        <select
          name="hall"
          value={filters.hall || ""}
          onChange={handleChange}
          className={inputClass}
        >
          <option value="">All Halls</option>
          {halls.map((hall) => (
            <option key={hall} value={hall}>
              {hall}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Shift">
        <select
          name="shift"
          value={filters.shift || ""}
          onChange={handleChange}
          className={inputClass}
        >
          <option value="">All Shifts</option>
          {shifts.map((shift) => (
            <option key={shift} value={shift}>
              {shift}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Machine">
        <select
          name="machine"
          value={filters.machine || ""}
          onChange={handleChange}
          className={inputClass}
        >
          <option value="">All Machines</option>
          {machineOptions.map((machine) => {
            const code = getMachineCode(machine);
            const label = getMachineLabel(machine);

            return (
              <option key={code} value={code}>
                {label}
              </option>
            );
          })}
        </select>
      </FilterField>

      <FilterField label="Operator">
        <input
          type="text"
          name="operator"
          value={filters.operator || ""}
          onChange={handleChange}
          placeholder="Search operator"
          className={`${inputClass} placeholder:text-slate-400`}
        />
      </FilterField>

      <FilterField label="Actions">
        <button
          type="button"
          onClick={handleReset}
          className="h-10 w-full rounded-md border border-slate-300 bg-slate-100 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          Reset
        </button>
      </FilterField>
    </div>
  );

  return (
    <section className="border-b border-slate-200 bg-white shadow-sm">
      <div className="px-3 py-2.5 sm:px-4 md:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-6 shrink-0 items-center rounded border border-slate-900 bg-slate-900 px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white">
                DIXON
              </div>

              <h1 className="truncate text-sm font-semibold tracking-tight text-slate-950 sm:text-base">
                Production Panel
              </h1>
            </div>

            <p className="mt-0.5 hidden text-[11px] text-slate-500 sm:block">
              Monitor and filter production records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden h-8 items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 sm:inline-flex">
              Live
            </div>

            <Link
              to="/entry"
              className="hidden h-10 items-center justify-center gap-2 rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:inline-flex"
            >
              <FaPlus className="text-[11px]" />
              Add Entry
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:hidden"
            >
              {mobileOpen ? <FaTimes className="text-[12px]" /> : <FaSlidersH className="text-[12px]" />}
              Filter
              {activeFilterCount > 0 ? (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-900 px-1.5 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 md:hidden">
          {filters.date ? <ActiveChip>Date</ActiveChip> : null}
          {filters.hall ? <ActiveChip>{filters.hall}</ActiveChip> : null}
          {filters.shift ? <ActiveChip>{filters.shift}</ActiveChip> : null}
          {filters.machine ? <ActiveChip>{filters.machine}</ActiveChip> : null}
          {filters.operator ? <ActiveChip>{filters.operator}</ActiveChip> : null}
          {activeFilterCount === 0 ? (
            <span className="inline-flex h-7 items-center text-[11px] text-slate-400">
              No active filters
            </span>
          ) : null}
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-slate-50 px-3 py-3 md:hidden">
          <FilterFields />

          <div className="mt-3 flex gap-2 sm:hidden">
            <Link
              to="/entry"
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <FaPlus className="text-[11px]" />
              Add Entry
            </Link>
          </div>
        </div>
      )}

      <div className="hidden border-t border-slate-200 px-4 py-3 md:block md:px-5">
        <FilterFields />
      </div>
    </section>
  );
}