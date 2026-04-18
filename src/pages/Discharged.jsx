import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function printSummary(p) {
  const win = window.open("", "_blank");
  win.document.write(`
    <html>
      <head>
        <title>Discharge Summary — ${p.name}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; }
          .header { text-align: center; border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
          .hospital { font-size: 26px; font-weight: 800; color: #4f46e5; }
          .title { font-size: 14px; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
          h2 { font-size: 13px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 24px 0 12px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .item { background: #f8fafc; padding: 12px 16px; border-radius: 10px; }
          .item .key { font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
          .item .val { font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 3px; }
          .rx { background: #f0f4ff; padding: 20px; border-radius: 12px; line-height: 2; font-size: 14px; white-space: pre-wrap; }
          .notes { background: #fff7ed; padding: 16px; border-radius: 12px; line-height: 1.8; font-size: 14px; }
          .footer { margin-top: 60px; display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          .sign { text-align: right; margin-top: 50px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hospital">🏥 OPD Management System</div>
          <div class="title">Discharge Summary</div>
        </div>

        <h2>Patient Information</h2>
        <div class="grid">
          <div class="item"><div class="key">Name</div><div class="val">${p.name}</div></div>
          <div class="item"><div class="key">Age / Gender</div><div class="val">${p.age} yrs / ${p.gender || "—"}</div></div>
          <div class="item"><div class="key">Contact</div><div class="val">${p.contact || "—"}</div></div>
          <div class="item"><div class="key">Blood Group</div><div class="val">${p.blood || "—"}</div></div>
          <div class="item"><div class="key">Admitted</div><div class="val">${p.date || "—"}</div></div>
          <div class="item"><div class="key">Discharged</div><div class="val">${p.dischargeDate || "—"}</div></div>
          <div class="item"><div class="key">Diagnosis</div><div class="val">${p.disease || "—"}</div></div>
          <div class="item"><div class="key">Doctor</div><div class="val">${p.doctor || "—"}</div></div>
        </div>

        ${(p.vitals?.bp || p.vitals?.temp || p.vitals?.pulse || p.vitals?.weight) ? `
        <h2>Vitals at Discharge</h2>
        <div class="grid">
          <div class="item"><div class="key">Blood Pressure</div><div class="val">${p.vitals?.bp || "—"}</div></div>
          <div class="item"><div class="key">Temperature</div><div class="val">${p.vitals?.temp || "—"}</div></div>
          <div class="item"><div class="key">Pulse Rate</div><div class="val">${p.vitals?.pulse || "—"}</div></div>
          <div class="item"><div class="key">Weight</div><div class="val">${p.vitals?.weight || "—"}</div></div>
        </div>` : ""}

        ${p.prescription ? `
        <h2>Prescription (${p.prescribedDisease || p.disease})</h2>
        <div class="rx">${p.prescription}</div>` : ""}

        ${p.dischargeNotes ? `
        <h2>Doctor's Notes</h2>
        <div class="notes">${p.dischargeNotes}</div>` : ""}

        <div class="sign">
          ________________________<br/>
          Dr. ${p.doctor || "Attending Physician"}<br/>
          <small>${p.dischargeDate || ""}</small>
        </div>

        <div class="footer">
          <span>Patient ID: #${p.id}</span>
          <span>Printed: ${new Date().toLocaleString()}</span>
        </div>
        <script>window.print();</script>
      </body>
    </html>
  `);
  win.document.close();
}

export default function Discharged() {
  const [data,   setData]   = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const load = () => {
    const d = JSON.parse(localStorage.getItem("discharged")) || [];
    setData([...d].reverse());
  };

  useEffect(() => {
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

  const filtered = data.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.disease?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Discharged Patients</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => navigate("/reports")}
          className="self-start inline-flex items-center gap-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
        >
          📈 View Full Reports
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or disease..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-5xl">🚪</span>
          <p className="font-semibold">{data.length === 0 ? "No discharged patients yet" : "No matches found"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p, i) => (
            <div
              key={p.id + i}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all animate-fade-in"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Patient header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-white font-bold flex items-center justify-center shrink-0">
                  {p.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-white truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">Age {p.age} · {p.blood || "—"}</p>
                </div>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2.5 py-1 rounded-full shrink-0">✓ Done</span>
              </div>

              {/* Info */}
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <span>🦠</span><span>{p.disease}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <span>👨‍⚕️</span><span>{p.doctor}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <span>📅</span><span>Discharged: {p.dischargeDate || "—"}</span>
                </div>
                {p.prescription && (
                  <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                    <span>💊</span><span className="text-xs truncate">{p.prescribedDisease || p.disease}</span>
                  </div>
                )}
                {p.dischargeNotes && (
                  <div className="flex items-start gap-2 text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>📝</span><span className="text-xs leading-relaxed line-clamp-2">{p.dischargeNotes}</span>
                  </div>
                )}
              </div>

              {/* Print button */}
              <button
                onClick={() => printSummary(p)}
                className="mt-4 w-full py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all flex items-center justify-center gap-2"
              >
                🖨️ Print Discharge Summary
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}