import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";


function MiniBar({ label, value, max, color }) {
  const pct = Math.round((value / Math.max(max, 1)) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[60%]">{label}</span>
        <span className="text-slate-500 dark:text-slate-400 font-semibold">{value}</span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [patients,   setPatients]   = useState([]);
  const [discharged, setDischarged] = useState([]);
  const navigate = useNavigate();

  const loadData = () => {
    const api   = JSON.parse(localStorage.getItem("apiPatients")) || [];
    const local = JSON.parse(localStorage.getItem("patients"))    || [];
    const dis   = JSON.parse(localStorage.getItem("discharged"))  || [];
    setPatients([...api, ...local]);
    setDischarged(dis);
  };

  useEffect(() => {
    loadData();
    window.addEventListener("storage", loadData);
    return () => window.removeEventListener("storage", loadData);
  }, []);

  const total = patients.length;

  // Disease breakdown
  const diseaseMap = {};
  patients.forEach(p => { diseaseMap[p.disease] = (diseaseMap[p.disease] || 0) + 1; });
  const topDisease = Object.entries(diseaseMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Doctor workload
  const doctorMap = {};
  patients.forEach(p => { doctorMap[p.doctor] = (doctorMap[p.doctor] || 0) + 1; });
  const topDoctors = Object.entries(doctorMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Priority breakdown
  const priorityCounts = {
    Critical: patients.filter(p => p.priority === "Critical").length,
    High:     patients.filter(p => p.priority === "High").length,
    Medium:   patients.filter(p => p.priority === "Medium").length,
    Low:      patients.filter(p => p.priority === "Low").length,
  };

  const recentLocal = JSON.parse(localStorage.getItem("patients")) || [];
  const recentAdded = [...recentLocal].reverse().slice(0, 5);
  const recentDis   = [...discharged].reverse().slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">OPD Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/add")}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow transition-all hover:shadow-indigo-500/30 hover:scale-105 active:scale-95"
          >
            ➕ Add Patient
          </button>
        </div>
      </div>

      {/* OPD Patient Flow — Gradient Cards */}
      {(() => {
        const DAILY_CAPACITY = 50;
        const remaining = Math.max(DAILY_CAPACITY - total, 0);
        const pct = Math.min(Math.round((total / DAILY_CAPACITY) * 100), 100);
        const capGradient = pct >= 90 ? "from-rose-500 to-rose-700" : pct >= 70 ? "from-amber-500 to-amber-600" : "from-violet-500 to-violet-700";
        const statusLabel = pct >= 90 ? "⚠️ Almost Full" : pct >= 70 ? "🟡 Filling Up" : "🟢 Available";
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Registered */}
            <div className="card-hover bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-5 rounded-2xl shadow-lg animate-fade-in" style={{ animationDelay: "0ms" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">🧍</span>
                <span className="text-xs font-semibold bg-white/20 rounded-full px-2.5 py-0.5">Registered</span>
              </div>
              <p className="text-4xl font-extrabold tracking-tight">{total}</p>
              <p className="text-xs mt-1 text-white/70">Total in OPD</p>
            </div>

            {/* Capacity */}
            <div className={`card-hover bg-gradient-to-br ${capGradient} text-white p-5 rounded-2xl shadow-lg animate-fade-in`} style={{ animationDelay: "70ms" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">🏥</span>
                <span className="text-xs font-semibold bg-white/20 rounded-full px-2.5 py-0.5">Capacity</span>
              </div>
              <div className="flex items-end gap-2 mb-2">
                <p className="text-4xl font-extrabold tracking-tight">{remaining}</p>
                <p className="text-sm text-white/70 mb-1">/ {DAILY_CAPACITY} slots left</p>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-white/80 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs mt-1.5 text-white/70">{statusLabel} · {pct}% filled</p>
            </div>

            {/* Completed */}
            <div className="card-hover bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-5 rounded-2xl shadow-lg animate-fade-in" style={{ animationDelay: "140ms" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">✅</span>
                <span className="text-xs font-semibold bg-white/20 rounded-full px-2.5 py-0.5">Completed</span>
              </div>
              <p className="text-4xl font-extrabold tracking-tight">{discharged.length}</p>
              <p className="text-xs mt-1 text-white/70">Treated & discharged</p>
            </div>
          </div>
        );
      })()}




      {/* Priority Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 animate-fade-in">
        <h2 className="font-semibold text-slate-700 dark:text-slate-200 mb-5">⚡ Patient Priority Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { level: "Critical", count: priorityCounts.Critical, bg: "bg-rose-50 dark:bg-rose-900/20",   text: "text-rose-600 dark:text-rose-400",     dot: "bg-rose-500" },
            { level: "High",     count: priorityCounts.High,     bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400",   dot: "bg-amber-500" },
            { level: "Medium",   count: priorityCounts.Medium,   bg: "bg-blue-50 dark:bg-blue-900/20",   text: "text-blue-600 dark:text-blue-400",     dot: "bg-blue-500" },
            { level: "Low",      count: priorityCounts.Low,      bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
          ].map(({ level, count, bg, text, dot }) => (
            <div key={level} className={`${bg} rounded-2xl p-4 text-center`}>
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{level}</span>
              </div>
              <p className={`text-3xl font-extrabold ${text}`}>{count}</p>
              <p className="text-xs text-slate-400 mt-1">{total > 0 ? Math.round((count / total) * 100) : 0}% of total</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom grid — Disease & Doctor breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Disease breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">🦠 Top Diagnoses</h2>
          {topDisease.length === 0
            ? <p className="text-sm text-slate-400">No data yet</p>
            : <div className="space-y-3">
                {topDisease.map(([d, c]) => (
                  <MiniBar key={d} label={d} value={c} max={total} color="bg-indigo-500" />
                ))}
              </div>
          }
        </div>

        {/* Doctor workload */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">👨‍⚕️ Doctor Workload</h2>
          {topDoctors.length === 0
            ? <p className="text-sm text-slate-400">No data yet</p>
            : <div className="space-y-3">
                {topDoctors.map(([d, c]) => (
                  <MiniBar key={d} label={d} value={c} max={total} color="bg-violet-500" />
                ))}
              </div>
          }
        </div>
      </div>

      {/* Recent activity row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recently added */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">🕐 Recently Admitted</h2>
          {recentAdded.length === 0
            ? <p className="text-sm text-slate-400">No patients added yet</p>
            : <ul className="space-y-3">
                {recentAdded.map(p => (
                  <li key={p.id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl px-2 py-1.5 transition-all" onClick={() => navigate(`/patient/${p.id}`)}>
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm font-bold flex items-center justify-center shrink-0">
                      {p.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400 truncate">{p.disease} · {p.doctor}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                      p.priority === "Critical" ? "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300" :
                      p.priority === "High"     ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300" :
                      "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300"
                    }`}>{p.priority || "Low"}</span>
                  </li>
                ))}
              </ul>
          }
        </div>

        {/* Recently discharged */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">✅ Recently Discharged</h2>
          {recentDis.length === 0
            ? <p className="text-sm text-slate-400">No discharges yet</p>
            : <ul className="space-y-3">
                {recentDis.map(p => (
                  <li key={p.id} className="flex items-center gap-3 px-2 py-1.5 rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-bold flex items-center justify-center shrink-0">
                      {p.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400 truncate">{p.dischargeDate || p.date} · {p.disease}</p>
                    </div>
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold shrink-0">Treated</span>
                  </li>
                ))}
              </ul>
          }
        </div>
      </div>
    </div>
  );
}