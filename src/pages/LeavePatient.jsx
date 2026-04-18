import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "../components/Toast";
import { PRESCRIPTIONS } from "../data/prescriptions";

const inputCls = "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all";

export default function LeavePatient() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const toast    = useToast();

  const [patient,      setPatient]      = useState(null);
  const [confirm,      setConfirm]      = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [discharged,   setDischarged]   = useState(false);
  const [dischargedPt, setDischargedPt] = useState(null);

  // Vitals
  const [bp,       setBp]       = useState("");
  const [temp,     setTemp]     = useState("");
  const [pulse,    setPulse]    = useState("");
  const [weight,   setWeight]   = useState("");

  // Prescription
  const [selDisease,    setSelDisease]    = useState("");
  const [prescription,  setPrescription]  = useState("");

  // Doctor notes
  const [doctorNotes, setDoctorNotes] = useState("");

  useEffect(() => {
    const api   = JSON.parse(localStorage.getItem("apiPatients")) || [];
    const local = JSON.parse(localStorage.getItem("patients"))    || [];
    const found = [...api, ...local].find(p => p.id === Number(id));
    setPatient(found || null);
    if (found?.disease) {
      // Auto-match prescription if disease exists
      const match = PRESCRIPTIONS.find(
        pr => pr.disease.toLowerCase().includes(found.disease.toLowerCase()) ||
              found.disease.toLowerCase().includes(pr.disease.toLowerCase())
      );
      if (match) {
        setSelDisease(match.disease);
        setPrescription(match.prescription);
      }
    }
  }, [id]);

  // When disease is selected, auto-fill prescription
  const handleDiseaseChange = (disease) => {
    setSelDisease(disease);
    const match = PRESCRIPTIONS.find(p => p.disease === disease);
    setPrescription(match ? match.prescription : "");
  };

  const handleDischarge = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));

    let api        = JSON.parse(localStorage.getItem("apiPatients")) || [];
    let local      = JSON.parse(localStorage.getItem("patients"))    || [];
    let dischargedList = JSON.parse(localStorage.getItem("discharged")) || [];

    let p = null;
    if (api.find(x => x.id === Number(id))) {
      p   = api.find(x => x.id === Number(id));
      api = api.filter(x => x.id !== Number(id));
      localStorage.setItem("apiPatients", JSON.stringify(api));
    } else if (local.find(x => x.id === Number(id))) {
      p     = local.find(x => x.id === Number(id));
      local = local.filter(x => x.id !== Number(id));
      localStorage.setItem("patients", JSON.stringify(local));
    }

    if (!p) { toast("Patient not found.", "error"); setLoading(false); return; }

    const record = {
      ...p,
      status:        "Discharged",
      dischargeDate: new Date().toISOString().slice(0, 10),
      dischargeNotes: doctorNotes,
      vitals: { bp, temp, pulse, weight },
      prescribedDisease: selDisease,
      prescription,
    };

    dischargedList.push(record);
    localStorage.setItem("discharged", JSON.stringify(dischargedList));
    window.dispatchEvent(new Event("storage"));

    toast(`${p.name} discharged successfully.`, "success");
    setDischargedPt(record);
    setDischarged(true);
    setLoading(false);
  };

  const handlePrint = () => {
    if (!dischargedPt) return;
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Discharge Summary — ${dischargedPt.name}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; }
            .header { text-align: center; border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
            .hospital { font-size: 26px; font-weight: 800; color: #4f46e5; }
            .title { font-size: 14px; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
            h2 { font-size: 14px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 24px 0 12px; }
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
            <div class="item"><div class="key">Name</div><div class="val">${dischargedPt.name}</div></div>
            <div class="item"><div class="key">Age / Gender</div><div class="val">${dischargedPt.age} yrs / ${dischargedPt.gender || "—"}</div></div>
            <div class="item"><div class="key">Contact</div><div class="val">${dischargedPt.contact || "—"}</div></div>
            <div class="item"><div class="key">Blood Group</div><div class="val">${dischargedPt.blood || "—"}</div></div>
            <div class="item"><div class="key">Admitted</div><div class="val">${dischargedPt.date || "—"}</div></div>
            <div class="item"><div class="key">Discharged</div><div class="val">${dischargedPt.dischargeDate}</div></div>
            <div class="item"><div class="key">Diagnosis</div><div class="val">${dischargedPt.disease || "—"}</div></div>
            <div class="item"><div class="key">Doctor</div><div class="val">${dischargedPt.doctor || "—"}</div></div>
          </div>

          <h2>Vitals at Discharge</h2>
          <div class="grid">
            <div class="item"><div class="key">Blood Pressure</div><div class="val">${dischargedPt.vitals?.bp || "Not recorded"}</div></div>
            <div class="item"><div class="key">Temperature</div><div class="val">${dischargedPt.vitals?.temp || "Not recorded"}</div></div>
            <div class="item"><div class="key">Pulse Rate</div><div class="val">${dischargedPt.vitals?.pulse || "Not recorded"}</div></div>
            <div class="item"><div class="key">Weight</div><div class="val">${dischargedPt.vitals?.weight || "Not recorded"}</div></div>
          </div>

          <h2>Prescription (${dischargedPt.prescribedDisease || dischargedPt.disease})</h2>
          <div class="rx">${dischargedPt.prescription || "No prescription added."}</div>

          ${dischargedPt.dischargeNotes ? `
          <h2>Doctor's Notes</h2>
          <div class="notes">${dischargedPt.dischargeNotes}</div>` : ""}

          <div class="sign">
            ________________________<br/>
            Dr. ${dischargedPt.doctor || "Attending Physician"}<br/>
            <small>${dischargedPt.dischargeDate}</small>
          </div>

          <div class="footer">
            <span>Patient ID: #${dischargedPt.id}</span>
            <span>Generated: ${new Date().toLocaleString()}</span>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  // ─── Not found ──────────────────────────────────────────────────────────────
  if (!patient && !discharged) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
        <span className="text-5xl">🔍</span>
        <p className="font-semibold">Patient not found</p>
        <button onClick={() => navigate("/")} className="text-indigo-500 hover:underline text-sm">Back to patients</button>
      </div>
    );
  }

  // ─── After discharge — print screen ─────────────────────────────────────────
  if (discharged && dischargedPt) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in space-y-5">
        <div className="text-center py-8">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto text-4xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{dischargedPt.name} Discharged</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Patient has been successfully discharged on {dischargedPt.dischargeDate}</p>
        </div>

        {/* Discharge Summary Preview */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-4 bg-indigo-500 rounded-full" /> Discharge Summary
          </h2>

          {/* Vitals */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Vitals at Discharge</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "BP", value: dischargedPt.vitals?.bp || "—", icon: "🩺" },
                { label: "Temp", value: dischargedPt.vitals?.temp || "—", icon: "🌡️" },
                { label: "Pulse", value: dischargedPt.vitals?.pulse || "—", icon: "💓" },
                { label: "Weight", value: dischargedPt.vitals?.weight || "—", icon: "⚖️" },
              ].map(v => (
                <div key={v.label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-lg">{v.icon}</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{v.value}</p>
                  <p className="text-xs text-slate-400">{v.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Prescription */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Prescription — {dischargedPt.prescribedDisease || dischargedPt.disease}</p>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-medium">
                {dischargedPt.prescription || "No prescription"}
              </p>
            </div>
          </div>

          {/* Doctor Notes */}
          {dischargedPt.dischargeNotes && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Doctor's Notes</p>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{dischargedPt.dischargeNotes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => navigate("/discharged")} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all">
            View All Discharged
          </button>
          <button onClick={handlePrint} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all">
            🖨️ Print Discharge Summary
          </button>
        </div>
      </div>
    );
  }

  // ─── Main discharge form ─────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Discharge Patient</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Fill in vitals, prescription & notes before confirming</p>
      </div>

      {/* Patient summary */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-extrabold">
            {patient.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800 dark:text-white">{patient.name}</p>
            <p className="text-sm text-slate-500">{patient.disease} · {patient.doctor}</p>
          </div>
          <span className="ml-auto text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            {patient.priority || "Low"} Priority
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          {[
            { k: "Age",      v: `${patient.age} yrs` },
            { k: "Blood",    v: patient.blood || "—" },
            { k: "Contact",  v: patient.contact },
            { k: "Admitted", v: patient.date || "—" },
          ].map(({ k, v }) => (
            <div key={k} className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{k}</p>
              <p className="text-slate-800 dark:text-white font-semibold mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vitals */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-rose-500 rounded-full inline-block" /> Vitals at Discharge
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Blood Pressure", placeholder: "e.g. 120/80", value: bp, onChange: setBp, icon: "🩺" },
            { label: "Temperature",    placeholder: "e.g. 98.6°F",  value: temp, onChange: setTemp, icon: "🌡️" },
            { label: "Pulse Rate",     placeholder: "e.g. 72 bpm",  value: pulse, onChange: setPulse, icon: "💓" },
            { label: "Weight",         placeholder: "e.g. 68 kg",   value: weight, onChange: setWeight, icon: "⚖️" },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{f.icon} {f.label}</label>
              <input value={f.value} onChange={e => f.onChange(e.target.value)} placeholder={f.placeholder} className={inputCls} />
            </div>
          ))}
        </div>
      </div>

      {/* Prescription */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-4 bg-indigo-500 rounded-full inline-block" /> Prescription
        </h2>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Select Disease</label>
          <select value={selDisease} onChange={e => handleDiseaseChange(e.target.value)} className={inputCls}>
            <option value="">— Choose a disease —</option>
            {PRESCRIPTIONS.map(p => <option key={p.disease} value={p.disease}>{p.disease}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Prescription (auto-filled, editable)</label>
          <textarea
            rows={6}
            value={prescription}
            onChange={e => setPrescription(e.target.value)}
            placeholder="Select a disease above to auto-fill, or type manually..."
            className={inputCls}
          />
        </div>
      </div>

      {/* Doctor Notes */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" /> Doctor's Notes
        </h2>
        <textarea
          rows={3}
          value={doctorNotes}
          onChange={e => setDoctorNotes(e.target.value)}
          placeholder="Follow-up instructions, treatment outcome, special care notes..."
          className={inputCls}
        />
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4">
        <span className="text-xl shrink-0">⚠️</span>
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">This action cannot be undone</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">The patient will be moved to discharged records.</p>
        </div>
      </div>

      {/* Confirm checkbox */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} className="w-4 h-4 rounded accent-indigo-600" />
        <span className="text-sm text-slate-700 dark:text-slate-300">
          I confirm the discharge of <strong>{patient.name}</strong> today.
        </span>
      </label>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => navigate(-1)} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all">
          Cancel
        </button>
        <button
          onClick={handleDischarge}
          disabled={!confirm || loading}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow hover:shadow-rose-500/30 hover:scale-105 active:scale-95 transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Processing...
            </span>
          ) : "🚪 Confirm Discharge"}
        </button>
      </div>
    </div>
  );
}