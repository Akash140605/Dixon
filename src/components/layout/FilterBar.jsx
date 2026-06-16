import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
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
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function FilterBar() {
  const { filters, setFilters, resetFilters } = useProduction();

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

  const inputClass =
    "h-11 w-full min-w-0 rounded-none border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

  return (
    <section className="border-b border-slate-300 bg-white shadow-sm">
      <div className="px-3 py-3 sm:px-4 md:px-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex shrink-0 items-center border border-slate-900 bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                DIXON
              </div>

              <div className="hidden h-4 w-px bg-slate-300 md:block" />

              <h1 className="min-w-0 text-sm font-semibold tracking-tight text-slate-950 sm:text-base md:text-lg">
                Production Control Panel
              </h1>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Hall, shift, machine and operator filters.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
            <div className="inline-flex h-9 shrink-0 items-center justify-center border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
              Live
            </div>

            <Link
              to="/entry"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-none border border-slate-900 bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto sm:min-w-[140px]"
            >
              <FaPlus className="text-[11px]" />
              Add Entry
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 px-3 py-3 sm:px-4 md:px-5">
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
              onClick={resetFilters}
              className="h-11 w-full rounded-none border border-slate-300 bg-slate-100 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Reset
            </button>
          </FilterField>
        </div>
      </div>
    </section>
  );
}