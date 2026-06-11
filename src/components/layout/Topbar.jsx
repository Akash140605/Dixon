import { Link } from "react-router-dom";
import { FaPlus } from "react-icons/fa";

export default function Topbar() {
  return (
    <header className="border-b border-slate-300 bg-white">
      <div className="px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white">
                DIXON
              </div>

              <div className="hidden md:block h-6 w-px bg-slate-300" />

              <div>
                <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
                  Production Dashboard
                </h1>
                <p className="text-sm text-slate-500">
                  Hall, Shift, Machine, Operator Analysis
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="hidden lg:block text-sm font-medium text-slate-500">
              Live Manufacturing View
            </div>

            <Link
              to="/entry"
              className="inline-flex items-center justify-center gap-2 border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <FaPlus className="text-xs" />
              Add Production Entry
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}