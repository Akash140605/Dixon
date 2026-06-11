import { useMemo } from "react";
import { halls, machineMap, shifts } from "../../data/formData";
import { useProduction } from "../../context/ProductionContext";

export default function FilterBar() {
  const { filters, setFilters, resetFilters } = useProduction();

  const machineOptions = useMemo(() => {
    if (!filters.hall) {
      return Object.values(machineMap).flat();
    }
    return machineMap[filters.hall] || [];
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

  return (
    <section className="border border-slate-300 bg-white p-4 md:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Filter Panel
          </p>
          <h3 className="mt-2 text-lg font-bold text-slate-900">
            Production Filters
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Date, hall, shift, machine aur operator ke hisaab se data filter karo.
          </p>
        </div>

        <div className="inline-flex items-center border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          Active filters update instantly
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Date
          </label>
          <input
            type="date"
            name="date"
            value={filters.date}
            onChange={handleChange}
            className="w-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Hall
          </label>
          <select
            name="hall"
            value={filters.hall}
            onChange={handleChange}
            className="w-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500"
          >
            <option value="">All Halls</option>
            {halls.map((hall) => (
              <option key={hall} value={hall}>
                {hall}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Shift
          </label>
          <select
            name="shift"
            value={filters.shift}
            onChange={handleChange}
            className="w-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500"
          >
            <option value="">All Shifts</option>
            {shifts.map((shift) => (
              <option key={shift} value={shift}>
                {shift}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Machine
          </label>
          <select
            name="machine"
            value={filters.machine}
            onChange={handleChange}
            className="w-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500"
          >
            <option value="">All Machines</option>
            {machineOptions.map((machine, index) => (
              <option key={`${machine}-${index}`} value={machine}>
                {machine}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Operator
          </label>
          <input
            type="text"
            name="operator"
            value={filters.operator}
            onChange={handleChange}
            placeholder="Search operator"
            className="w-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-500"
          />
        </div>

        <div className="flex items-end gap-3">
          <button
            type="button"
            className="flex-1 border border-slate-900 bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Apply Filters
          </button>

          <button
            type="button"
            onClick={resetFilters}
            className="border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-3">
        <p className="text-xs text-slate-500">
          Hall change hone par machine list automatically update hogi.
        </p>
      </div>
    </section>
  );
}