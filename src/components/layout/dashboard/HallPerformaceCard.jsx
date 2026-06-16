import { useMemo, useState } from "react";

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

function calculateLossRate(lossQty, target) {
  if (!Number(target)) return 0;
  return (Number(lossQty || 0) / Number(target || 0)) * 100;
}

function getAchievementStatus(achievement) {
  if (achievement >= 100) {
    return {
      label: "Ahead",
      chipClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      barClass: "bg-emerald-600",
      textClass: "text-emerald-700",
    };
  }

  if (achievement >= 85) {
    return {
      label: "On Track",
      chipClass: "border-sky-200 bg-sky-50 text-sky-700",
      barClass: "bg-sky-600",
      textClass: "text-sky-700",
    };
  }

  return {
    label: "Below Target",
    chipClass: "border-rose-200 bg-rose-50 text-rose-700",
    barClass: "bg-rose-600",
    textClass: "text-rose-700",
  };
}

function StatTile({ label, value, tone = "default", helper = "" }) {
  const toneMap = {
    default: "text-slate-900",
    sky: "text-sky-700",
    emerald: "text-emerald-700",
    rose: "text-rose-700",
    violet: "text-violet-700",
    amber: "text-amber-700",
  };

  return (
    <div className="border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-sm font-bold tabular-nums ${toneMap[tone] || toneMap.default}`}>
        {value}
      </p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function ProgressBar({ label, value, colorClass, textClass = "text-slate-700" }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className={`tabular-nums font-semibold ${textClass}`}>
          {value.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

function FilterChip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 border px-3 text-xs font-semibold transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
      }`}
    >
      {children}
    </button>
  );
}

export default function HallPerformanceCard({
  title = "Hall Wise Performance",
  subtitle = "Hall target, output, quality aur loss metrics ka updated overview.",
  countLabel = "0 halls",
  items = [],
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("achievementDesc");
  const [topFilter, setTopFilter] = useState("all");
  const [viewFilter, setViewFilter] = useState("all");

  const normalizedItems = useMemo(() => {
    return (items || []).map((item, index) => {
      const actual = Number(item.actual || 0);
      const good = Number(item.good || 0);
      const reject = Number(item.reject || 0);
      const target = Number(item.target || 0);
      const lossQty = Number(item.lossQty ?? item.lossTime ?? 0);
      const lossMinutes = Number(item.lossMinutes ?? item.lossTimeMinutes ?? 0);
      const entries = Number(item.entries || 0);

      const achievement = calculateAchievement(actual, target);
      const rejectRate = calculateRejectRate(reject, actual);
      const goodRate = calculateGoodRate(good, actual);
      const lossRate = calculateLossRate(lossQty, target);
      const variance = actual - target;
      const status = getAchievementStatus(achievement);

      return {
        ...item,
        _id: `${item.hall || "hall"}-${index}`,
        name: item.hall || "Unknown Hall",
        hall: item.hall || "Unknown Hall",
        actual,
        good,
        reject,
        target,
        lossQty,
        lossMinutes,
        entries,
        achievement,
        rejectRate,
        goodRate,
        lossRate,
        variance,
        status,
      };
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    let list = normalizedItems.filter((item) => {
      if (!query) return true;
      return String(item.name).toLowerCase().includes(query);
    });

    if (viewFilter === "underTarget") {
      list = list.filter((item) => item.actual < item.target);
    }

    if (viewFilter === "withReject") {
      list = list.filter((item) => item.reject > 0);
    }

    if (viewFilter === "withLoss") {
      list = list.filter((item) => item.lossQty > 0 || item.lossMinutes > 0);
    }

    list = [...list].sort((a, b) => {
      if (sortBy === "actualDesc") return b.actual - a.actual;
      if (sortBy === "goodDesc") return b.good - a.good;
      if (sortBy === "rejectDesc") return b.reject - a.reject;
      if (sortBy === "targetDesc") return b.target - a.target;
      if (sortBy === "lossQtyDesc") return b.lossQty - a.lossQty;
      if (sortBy === "lossMinutesDesc") return b.lossMinutes - a.lossMinutes;
      if (sortBy === "achievementDesc") return b.achievement - a.achievement;
      if (sortBy === "goodRateDesc") return b.goodRate - a.goodRate;
      if (sortBy === "rejectRateAsc") return a.rejectRate - b.rejectRate;
      if (sortBy === "varianceDesc") return b.variance - a.variance;
      if (sortBy === "nameAsc") return String(a.name).localeCompare(String(b.name));
      return b.achievement - a.achievement;
    });

    if (topFilter === "3") return list.slice(0, 3);
    if (topFilter === "5") return list.slice(0, 5);

    return list;
  }, [normalizedItems, search, sortBy, topFilter, viewFilter]);

  const summary = useMemo(() => {
    const totals = filteredItems.reduce(
      (acc, item) => {
        acc.actual += item.actual;
        acc.good += item.good;
        acc.reject += item.reject;
        acc.target += item.target;
        acc.lossQty += item.lossQty;
        acc.lossMinutes += item.lossMinutes;
        acc.entries += item.entries;
        return acc;
      },
      {
        actual: 0,
        good: 0,
        reject: 0,
        target: 0,
        lossQty: 0,
        lossMinutes: 0,
        entries: 0,
      }
    );

    const topActual = [...filteredItems].sort((a, b) => b.actual - a.actual)[0];
    const bestQuality = [...filteredItems].sort((a, b) => b.goodRate - a.goodRate)[0];
    const lowestReject = [...filteredItems].sort((a, b) => a.rejectRate - b.rejectRate)[0];
    const averageAchievement =
      filteredItems.length > 0
        ? filteredItems.reduce((sum, item) => sum + item.achievement, 0) / filteredItems.length
        : 0;

    return {
      ...totals,
      topActual: topActual?.name || "-",
      bestQuality: bestQuality?.name || "-",
      lowestReject: lowestReject?.name || "-",
      averageAchievement,
    };
  }, [filteredItems]);

  return (
    <section className="border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 md:text-xl">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            {countLabel}
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
            Visible: {filteredItems.length}
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Actual" value={formatNumber(summary.actual)} tone="sky" />
        <StatTile label="Good" value={formatNumber(summary.good)} tone="emerald" />
        <StatTile label="Reject" value={formatNumber(summary.reject)} tone="rose" />
        <StatTile label="Loss Qty" value={formatNumber(summary.lossQty)} tone="violet" />
        <StatTile
          label="Avg Achievement"
          value={`${summary.averageAchievement.toFixed(1)}%`}
          tone="amber"
        />
        <StatTile
          label="Top Hall"
          value={summary.topActual}
          helper="By actual output"
          tone="default"
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search hall..."
          className="h-11 border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-500"
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-11 border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-500"
        >
          <option value="achievementDesc">Sort: Achievement High-Low</option>
          <option value="actualDesc">Sort: Actual High-Low</option>
          <option value="goodDesc">Sort: Good High-Low</option>
          <option value="rejectDesc">Sort: Reject High-Low</option>
          <option value="targetDesc">Sort: Target High-Low</option>
          <option value="lossQtyDesc">Sort: Loss Qty High-Low</option>
          <option value="lossMinutesDesc">Sort: Loss Min High-Low</option>
          <option value="goodRateDesc">Sort: Good Rate High-Low</option>
          <option value="rejectRateAsc">Sort: Lowest Reject Rate</option>
          <option value="varianceDesc">Sort: Variance High-Low</option>
          <option value="nameAsc">Sort: Name A-Z</option>
        </select>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <FilterChip active={topFilter === "3"} onClick={() => setTopFilter("3")}>
          Top 3
        </FilterChip>
        <FilterChip active={topFilter === "5"} onClick={() => setTopFilter("5")}>
          Top 5
        </FilterChip>
        <FilterChip active={topFilter === "all"} onClick={() => setTopFilter("all")}>
          All
        </FilterChip>
        <FilterChip active={viewFilter === "all"} onClick={() => setViewFilter("all")}>
          All Halls
        </FilterChip>
        <FilterChip
          active={viewFilter === "underTarget"}
          onClick={() => setViewFilter("underTarget")}
        >
          Under Target
        </FilterChip>
        <FilterChip
          active={viewFilter === "withReject"}
          onClick={() => setViewFilter("withReject")}
        >
          With Reject
        </FilterChip>
        <FilterChip
          active={viewFilter === "withLoss"}
          onClick={() => setViewFilter("withLoss")}
        >
          With Loss
        </FilterChip>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Highest Output
          </p>
          <p className="mt-1 text-sm font-bold text-sky-700">{summary.topActual}</p>
        </div>

        <div className="border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Best Quality
          </p>
          <p className="mt-1 text-sm font-bold text-emerald-700">{summary.bestQuality}</p>
        </div>

        <div className="border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Lowest Reject
          </p>
          <p className="mt-1 text-sm font-bold text-rose-700">{summary.lowestReject}</p>
        </div>
      </div>

      <div
        className="custom-scroll space-y-4 overflow-y-auto pr-1"
        style={{ height: "min(580px, 70vh)", scrollbarWidth: "thin" }}
      >
        {filteredItems.length > 0 ? (
          filteredItems.map((item, index) => {
            const varianceLabel =
              item.variance > 0
                ? `+${formatNumber(item.variance)}`
                : formatNumber(item.variance);

            return (
              <div
                key={item._id}
                className="border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-7 min-w-[28px] items-center justify-center border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700">
                          #{index + 1}
                        </span>

                        <h4 className="text-base font-bold text-slate-900">
                          {item.name}
                        </h4>

                        <span className={`border px-2 py-1 text-[11px] font-semibold ${item.status.chipClass}`}>
                          {item.status.label}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="border border-slate-200 bg-white px-2 py-1 text-slate-600">
                          Target:{" "}
                          <span className="font-semibold tabular-nums">
                            {formatNumber(item.target)}
                          </span>
                        </span>

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

                        <span className="border border-slate-200 bg-white px-2 py-1 text-slate-600">
                          Loss Qty:{" "}
                          <span className="font-semibold tabular-nums">
                            {formatNumber(item.lossQty)}
                          </span>
                        </span>

                        <span className="border border-slate-200 bg-white px-2 py-1 text-slate-600">
                          Loss Min:{" "}
                          <span className="font-semibold tabular-nums">
                            {formatNumber(item.lossMinutes)}
                          </span>
                        </span>

                        <span className="border border-slate-200 bg-white px-2 py-1 text-slate-600">
                          Variance:{" "}
                          <span
                            className={`font-semibold tabular-nums ${
                              item.variance >= 0 ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {varianceLabel}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
                      <div className="border border-slate-200 bg-white p-3">
                        <p className="text-xs text-slate-500">Actual</p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-sky-700">
                          {formatNumber(item.actual)}
                        </p>
                      </div>

                      <div className="border border-slate-200 bg-white p-3">
                        <p className="text-xs text-slate-500">Achievement</p>
                        <p className={`mt-1 text-lg font-bold tabular-nums ${item.status.textClass}`}>
                          {item.achievement.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <StatTile
                      label="Achievement"
                      value={`${item.achievement.toFixed(1)}%`}
                      tone={item.achievement >= 100 ? "emerald" : "sky"}
                    />
                    <StatTile
                      label="Good Rate"
                      value={`${item.goodRate.toFixed(1)}%`}
                      tone="emerald"
                    />
                    <StatTile
                      label="Reject Rate"
                      value={`${item.rejectRate.toFixed(1)}%`}
                      tone="rose"
                    />
                    <StatTile
                      label="Loss Rate"
                      value={`${item.lossRate.toFixed(1)}%`}
                      tone="violet"
                    />
                  </div>

                  <div className="space-y-4">
                    <ProgressBar
                      label="Target Achievement"
                      value={item.achievement}
                      colorClass={item.status.barClass}
                      textClass={item.status.textClass}
                    />

                    <ProgressBar
                      label="Reject Rate"
                      value={item.rejectRate}
                      colorClass="bg-rose-600"
                      textClass="text-rose-700"
                    />

                    <ProgressBar
                      label="Loss Rate"
                      value={item.lossRate}
                      colorClass="bg-violet-600"
                      textClass="text-violet-700"
                    />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Koi hall-wise data available nahi hai.
          </div>
        )}
      </div>
    </section>
  );
}