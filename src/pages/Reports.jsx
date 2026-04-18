import { useState, useEffect } from "react";
import { useToast } from "../components/Toast";

const DEFAULT_SETTINGS = {
  hospitalName: "City OPD Clinic",
  doctorName:   "Dr. Sharma",
  city:         "New Delhi",
  phone:        "",
  capacity:     50,
  doctors: [
    "General Physician",
    "Cardiologist",
    "Dermatologist",
    "Orthopedic",
    "Neurologist",
    "Pediatrician",
    "ENT Specialist",
  ],
};

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem("opdSettings")) || DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function Settings() {
  const toast = useToast();
  const [settings,   setSettings]   = useState(loadSettings);
  const [newDoctor,  setNewDoctor]   = useState("");
  const [saved,      setSaved]       = useState(false);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem("opdSettings", JSON.stringify(settings));
    window.dispatchEvent(new Event("storage"));
    setSaved(true);
    toast("Settings saved successfully!", "success");
  };

  const addDoctor = () => {
    const name = newDoctor.trim();
    if (!name) return;
    if (settings.doctors.includes(name)) {
      toast("Doctor already exists.", "error");
      return;
    }
    setSettings(prev => ({ ...prev, doctors: [...prev.doctors, name] }));
    setNewDoctor("");
    setSaved(false);
  };

  const removeDoctor = (name) => {
    setSettings(prev => ({ ...prev, doctors: prev.doctors.filter(d => d !== name) }));
    setSaved(false);
  };

  const resetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    setSaved(false);
    toast("Reset to default settings.", "info");
  };

  const inputCls = "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">⚙️ Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure your OPD system preferences</p>
        </div>
        <button
          onClick={resetDefaults}
          className="text-xs font-semibold text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
        >
          ↩ Reset Defaults
        </button>
      </div>

      {/* Hospital Info */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-4 bg-indigo-500 rounded-full inline-block" /> Hospital / Clinic Info
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Clinic / Hospital Name</label>
            <input value={settings.hospitalName} onChange={e => handleChange("hospitalName", e.target.value)} placeholder="e.g. City OPD Clinic" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Senior Doctor / In-charge</label>
            <input value={settings.doctorName} onChange={e => handleChange("doctorName", e.target.value)} placeholder="e.g. Dr. Sharma" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">City</label>
            <input value={settings.city} onChange={e => handleChange("city", e.target.value)} placeholder="e.g. New Delhi" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Contact Number</label>
            <input value={settings.phone} onChange={e => handleChange("phone", e.target.value)} placeholder="e.g. +91 98765 43210" className={inputCls} />
          </div>
        </div>
      </div>

      {/* OPD Config */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-4 bg-violet-500 rounded-full inline-block" /> OPD Configuration
        </h2>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Daily Patient Capacity</label>
          <div className="flex items-center gap-4">
            <input
              type="range" min={10} max={200} step={5}
              value={settings.capacity}
              onChange={e => handleChange("capacity", Number(e.target.value))}
              className="flex-1 accent-indigo-600"
            />
            <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 w-12 text-center">{settings.capacity}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Maximum patients per day before OPD shows as full (used in Dashboard capacity card)</p>
        </div>
      </div>

      {/* Doctors List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-4 bg-emerald-500 rounded-full inline-block" /> Manage Doctors
        </h2>
        <p className="text-xs text-slate-400">These doctors appear in the Add Patient dropdown.</p>

        {/* Add new */}
        <div className="flex gap-2">
          <input
            value={newDoctor}
            onChange={e => setNewDoctor(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addDoctor()}
            placeholder="Add a new doctor or specialization..."
            className={inputCls + " flex-1"}
          />
          <button
            onClick={addDoctor}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            + Add
          </button>
        </div>

        {/* Doctor tags */}
        <div className="flex flex-wrap gap-2">
          {settings.doctors.map(d => (
            <span key={d} className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full">
              👨‍⚕️ {d}
              <button onClick={() => removeDoctor(d)} className="text-slate-400 hover:text-rose-500 transition-colors ml-1 text-base leading-none">×</button>
            </span>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-xl text-sm font-bold transition-all shadow-lg ${
          saved
            ? "bg-emerald-600 text-white shadow-emerald-500/30"
            : "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-500/30 hover:scale-[1.01] active:scale-95"
        }`}
      >
        {saved ? "✅ Settings Saved!" : "💾 Save Settings"}
      </button>
    </div>
  );
}