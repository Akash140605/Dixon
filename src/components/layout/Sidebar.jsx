import { FaIndustry, FaChartBar, FaTable, FaCogs } from "react-icons/fa";

const items = [
  { name: "Dashboard", icon: <FaChartBar /> },
  { name: "Hourly Report", icon: <FaTable /> },
  { name: "Machines", icon: <FaCogs /> },
  { name: "Production", icon: <FaIndustry /> },
];

export default function Sidebar() {
  return (
    <aside className="w-20 md:w-64 bg-slate-900 border-r border-slate-800 min-h-screen p-4">
      <div className="text-xl font-bold mb-8 hidden md:block">ProdDash</div>
      <div className="space-y-3">
        {items.map((item) => (
          <button
            key={item.name}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="hidden md:inline">{item.name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}