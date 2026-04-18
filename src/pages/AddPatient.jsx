import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";

const DOCTORS = [
  "General Physician", "Cardiologist", "Dermatologist",
  "Orthopedic", "Neurologist", "Pediatrician", "ENT Specialist",
];

const BLOOD_GROUPS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];
const PRIORITIES   = ["Low", "Medium", "High", "Critical"];
const GENDERS      = ["Male", "Female", "Other"];

function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";

export default function AddPatient() {
  const navigate = useNavigate();
  const toast    = useToast();

  const [step, setStep] = useState(0); // 0: lookup, 1: form
  const [isExisting, setIsExisting] = useState(false);
  const [form, setForm] = useState({
    name: "", age: "", gender: "Male", blood: "B+",
    disease: "", contact: "", doctor: "", date: new Date().toISOString().slice(0, 10),
    priority: "Low", notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleLookup = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.contact.trim()) {
      toast("Please enter both name and contact number.", "warning");
      return;
    }

    const api      = JSON.parse(localStorage.getItem("apiPatients")) || [];
    const existing = JSON.parse(localStorage.getItem("patients"))    || [];
    const all = [...api, ...existing];

    const found = all.find(p =>
      p.name?.toLowerCase().trim() === form.name.toLowerCase().trim() ||
      p.contact?.trim() === form.contact.trim()
    );

    if (found) {
      setForm({ ...found });
      setIsExisting(true);
      toast(`Patient found! You can now edit ${found.name}'s details.`, "info");
    } else {
      setIsExisting(false);
    }
    setStep(1);
  };

  const handleSubmit = e => {
    e.preventDefault();
    const existing = JSON.parse(localStorage.getItem("patients"))    || [];

    if (isExisting) {
      // Update existing
      const updated = existing.map(p => p.id === form.id ? { ...form } : p);
      localStorage.setItem("patients", JSON.stringify(updated));
      toast(`✅ ${form.name}'s records updated!`, "success");
    } else {
      // Add new
      const apiCount = (JSON.parse(localStorage.getItem("apiPatients")) || []).length;
      if (apiCount + existing.length >= 100) {
        toast("❌ OPD is full! Cannot add more patients.", "error");
        return;
      }
      const newPatient = { id: Date.now(), ...form };
      localStorage.setItem("patients", JSON.stringify([...existing, newPatient]));
      toast(`✅ ${form.name} added successfully!`, "success");
    }

    window.dispatchEvent(new Event("storage"));
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-slide-up">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-4xl">✅</div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{isExisting ? "Patient Updated!" : "Patient Added!"}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">{form.name}'s records have been {isExisting ? "updated" : "registered"} in the OPD system.</p>
        <div className="flex gap-3 mt-2">
          <button onClick={() => navigate("/")} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all">View All Patients</button>
          <button onClick={() => { setSubmitted(false); setStep(0); setForm({ name:"",age:"",gender:"Male",blood:"B+",disease:"",contact:"",doctor:"",date:new Date().toISOString().slice(0,10),priority:"Low",notes:"" }); }} className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-5 py-2.5 rounded-xl transition-all">Add Another</button>
        </div>
      </div>
    );
  }

  // Step 0: Lookup UI
  if (step === 0) {
    return (
      <div className="max-w-xl mx-auto animate-fade-in py-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto text-3xl mb-4 shadow-sm">🔍</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Patient Lookup</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Enter name or mobile number to check if the patient is already registered.</p>
        </div>

        <form onSubmit={handleLookup} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl space-y-6">
          <Field label="Full Name" required>
            <input name="name" required placeholder="e.g. Rahul Sharma" onChange={handleChange} value={form.name} className={inputCls} />
          </Field>
          <Field label="Mobile Number" required>
            <input name="contact" required placeholder="+91 98765 43210" onChange={handleChange} value={form.contact} className={inputCls} />
          </Field>
          <button type="submit" className="w-full py-4 rounded-2xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
            Continue →
          </button>
        </form>
      </div>
    );
  }

  // Step 1: Full Form UI
  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            {isExisting ? "Edit Patient Records" : "Complete Registration"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isExisting ? `Updating records for ${form.name}` : `Entering remaining details for ${form.name}`}
          </p>
        </div>
        <button onClick={() => setStep(0)} className="text-xs font-bold text-indigo-500 hover:underline">← Change Patient</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-5 flex items-center gap-2">
            <span className="w-1 h-4 bg-indigo-500 rounded-full inline-block" />
            Personal Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" required>
              <input name="name" required placeholder="e.g. Rahul Sharma" onChange={handleChange} value={form.name} className={inputCls} />
            </Field>
            <Field label="Contact Number" required>
              <input name="contact" required placeholder="+91 98765 43210" onChange={handleChange} value={form.contact} className={inputCls} />
            </Field>
            <Field label="Age" required>
              <input name="age" type="number" required min={0} max={150} placeholder="e.g. 35" onChange={handleChange} value={form.age} className={inputCls} />
            </Field>
            <Field label="Gender">
              <select name="gender" onChange={handleChange} value={form.gender} className={inputCls}>
                {GENDERS.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Blood Group">
              <select name="blood" onChange={handleChange} value={form.blood} className={inputCls}>
                {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Admission Date" required>
              <input name="date" type="date" required onChange={handleChange} value={form.date} className={inputCls} />
            </Field>
          </div>
        </div>

        {/* Medical Info section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-5 flex items-center gap-2">
            <span className="w-1 h-4 bg-rose-500 rounded-full inline-block" />
            Medical Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Diagnosis / Disease" required>
              <input name="disease" required placeholder="e.g. Hypertension" onChange={handleChange} value={form.disease} className={inputCls} />
            </Field>
            <Field label="Assigned Doctor" required>
              <select name="doctor" required onChange={handleChange} value={form.doctor} className={inputCls}>
                <option value="">Select Doctor</option>
                {DOCTORS.map(d => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Priority / Severity">
              <select name="priority" onChange={handleChange} value={form.priority} className={inputCls}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Clinical Notes">
                <textarea
                  name="notes" rows={3} placeholder="Any additional notes, allergies, past medical history..."
                  onChange={handleChange} value={form.notes}
                  className={inputCls + " resize-none"}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => setStep(0)} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all">Cancel</button>
          <button type="submit" className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all">
            {isExisting ? "💾 Update Records" : "➕ Register Patient"}
          </button>
        </div>
      </form>
    </div>
  );
}