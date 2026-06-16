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
        <span className={`tabular-nums font-semibold ${textClass}`}>{value.toFixed(1)}%</span>
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

export default function OperatorPerformancePanel({
  items = [],
  title = "Operator Performance",
  subtitle = "Operator output, quality, rejection aur loss based performance overview.",
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("goodRateDesc");
  const [topFilter, setTopFilter] = useState("5");

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

      return {
        ...item,
        _id: `${item.operatorId || item.operator || "operator"}-${index}`,
        name: item.operator || "Unknown Operator",
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
      };
    });
  }, [items]);

  const processedItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = normalizedItems.filter((item) => {
      if (!query) return true;

      const haystack = [
        item.name,
        item.operator,
        item.operatorId,
        item.shift,
        item.hall,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    filtered.sort((a, b) => {
      if (sortBy === "actualDesc") return b.actual - a.actual;
      if (sortBy === "goodDesc") return b.good - a.good;
      if (sortBy === "rejectDesc") return b.reject - a.reject;
      if (sortBy === "targetDesc") return b.target - a.target;
      if (sortBy === "lossQtyDesc") return b.lossQty - a.lossQty;
      if (sortBy === "lossMinutesDesc") return b.lossMinutes - a.lossMinutes;
      if (sortBy === "achievementDesc") return b.achievement - a.achievement;
      if (sortBy === "goodRateDesc") return b.goodRate - a.goodRate;
      if (sortBy === "rejectRateAsc") return a.rejectRate - b.rejectRate;
      if (sortBy === "entriesDesc") return b.entries - a.entries;
      if (sortBy === "nameAsc") return String(a.name).localeCompare(String(b.name));
      return b.goodRate - a.goodRate;
    });

    if (topFilter === "all") return filtered;
    return filtered.slice(0, Number(topFilter));
  }, [normalizedItems, search, sortBy, topFilter]);

  const summary = useMemo(() => {
    const totals = processedItems.reduce(
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

    const topActual = [...processedItems].sort((a, b) => b.actual - a.actual)[0];
    const bestQuality = [...processedItems].sort((a, b) => b.goodRate - a.goodRate)[0];
    const lowestReject = [...processedItems].sort((a, b) => a.rejectRate - b.rejectRate)[0];

    return {
      ...totals,
      topActual: topActual?.name || "-",
      bestQuality: bestQuality?.name || "-",
      lowestReject: lowestReject?.name || "-",
    };
  }, [processedItems]);

  return (
    <section className="border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 md:text-xl">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            Total Operators: {items.length}
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
            Visible: {processedItems.length}
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Actual" value={formatNumber(summary.actual)} tone="sky" />
        <StatTile label="Good" value={formatNumber(summary.good)} tone="emerald" />
        <StatTile label="Reject" value={formatNumber(summary.reject)} tone="rose" />
        <StatTile label="Loss Qty" value={formatNumber(summary.lossQty)} tone="violet" />
        <StatTile label="Loss Min" value={formatNumber(summary.lossMinutes)} tone="amber" />
        <StatTile label="Top Operator" value={summary.topActual} helper="By actual output" />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search operator, ID, hall, shift..."
          className="h-11 border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-500"
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-11 border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-500"
        >
          <option value="goodRateDesc">Sort: Good Rate High-Low</option>
          <option value="actualDesc">Sort: Actual High-Low</option>
          <option value="goodDesc">Sort: Good High-Low</option>
          <option value="rejectDesc">Sort: Reject High-Low</option>
          <option value="targetDesc">Sort: Target High-Low</option>
          <option value="lossQtyDesc">Sort: Loss Qty High-Low</option>
          <option value="lossMinutesDesc">Sort: Loss Min High-Low</option>
          <option value="achievementDesc">Sort: Achievement High-Low</option>
          <option value="rejectRateAsc">Sort: Lowest Reject Rate</option>
          <option value="entriesDesc">Sort: Entries High-Low</option>
          <option value="nameAsc">Sort: Name A-Z</option>
        </select>

        <select
          value={topFilter}
          onChange={(e) => setTopFilter(e.target.value)}
          className="h-11 border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-500"
        >
          <option value="3">Top 3</option>
          <option value="5">Top 5</option>
          <option value="10">Top 10</option>
          <option value="all">All Operators</option>
        </select>
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
        style={{ height: "min(560px, 68vh)", scrollbarWidth: "thin" }}
      >
        {processedItems.length > 0 ? (
          processedItems.map((item, index) => {
            return (
              <div
                key={item._id}
                className="border border-slate-200 bg-slate-50 p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-7 min-w-[28px] items-center justify-center border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700">
                          #{index + 1}
                        </span>
                        <h4 className="text-base font-bold text-slate-900">{item.name}</h4>
                        {item.operatorId ? (
                          <span className="border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                            ID: <span className="font-semibold">{item.operatorId}</span>
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {item.hall ? (
                          <span className="border border-slate-200 bg-white px-2 py-1 text-slate-600">
                            Hall: <span className="font-semibold">{item.hall}</span>
                          </span>
                        ) : null}

                        {item.shift ? (
                          <span className="border border-slate-200 bg-white px-2 py-1 text-slate-600">
                            Shift: <span className="font-semibold">{item.shift}</span>
                          </span>
                        ) : null}

                        <span className="border border-slate-200 bg-white px-2 py-1 text-slate-600">
                          Entries: <span className="font-semibold tabular-nums">{formatNumber(item.entries)}</span>
                        </span>

                        <span className="border border-slate-200 bg-white px-2 py-1 text-slate-600">
                          Good: <span className="font-semibold tabular-nums">{formatNumber(item.good)}</span>
                        </span>

                        <span className="border border-slate-200 bg-white px-2 py-1 text-slate-600">
                          Reject: <span className="font-semibold tabular-nums">{formatNumber(item.reject)}</span>
                        </span>

                        <span className="border border-slate-200 bg-white px-2 py-1 text-slate-600">
                          Loss Qty: <span className="font-semibold tabular-nums">{formatNumber(item.lossQty)}</span>
                        </span>

                        <span className="border border-slate-200 bg-white px-2 py-1 text-slate-600">
                          Loss Min: <span className="font-semibold tabular-nums">{formatNumber(item.lossMinutes)}</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
                      <div className="border border-slate-200 bg-white p-3">
                        <p className="text-xs text-slate-500">Actual</p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700">
                          {formatNumber(item.actual)}
                        </p>
                      </div>

                      <div className="border border-slate-200 bg-white p-3">
                        <p className="text-xs text-slate-500">Good Rate</p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                          {item.goodRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <StatTile
                      label="Achievement"
                      value={`${item.achievement.toFixed(1)}%`}
                      tone="sky"
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
                      label="Good Output Ratio"
                      value={item.goodRate}
                      colorClass="bg-emerald-600"
                      textClass="text-emerald-700"
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
            Koi operator data available nahi hai.
          </div>
        )}
      </div>
    </section>
  );
}