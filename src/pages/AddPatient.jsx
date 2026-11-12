import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import {
  createApiPatient,
  fetchApiPatients,
  updateApiPatient
} from "../services/apiService";



const BLOOD_GROUPS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];

const GENDERS = ["Male", "Female", "Other"];

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
  const toast = useToast();

  const [step, setStep] = useState(0); // 0: lookup, 1: form
  const [isExisting, setIsExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", age: "", gender: "Male", blood: "",
    contact: "", address: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const [lookupLoading, setLookupLoading] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.contact.trim()) {
      toast("Please enter both name and contact number.", "warning");
      return;
    }

    try {
      setLookupLoading(true);

      const response = await fetchApiPatients();
      const patients = response.data || [];

      const found = patients.find(
        (p) => p.phone?.trim() === form.contact.trim()
      );

      if (found && found.name?.toLowerCase().trim() !== form.name.toLowerCase().trim()) {
        toast("Phone number exists, but the name does not match. Please verify details.", "error");
        return;
      }

      if (found) {
        setForm({
          ...form,
          _id: found._id,
          name: found.name || "",
          age: found.age ?? "",
          gender: found.gender || "Male",
          blood: found.bloodGroup || "",
          contact: found.phone || "",
          
          
          
          
          
          address: found.address || "",
        });

        setIsExisting(true);

        toast(`Patient found! You can now edit ${found.name}'s details.`, "info");
      } else {
        setIsExisting(false);
        toast("New patient. Please complete registration.", "info");
      }

      setStep(1);

    } catch (error) {
      console.error("Patient lookup error:", error);
      toast(error.message || "Unable to search patients.", "error");
    } finally {
      setLookupLoading(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const patientData = {
        name: form.name.trim(),
        age: Number(form.age),
        gender: form.gender,
        phone: form.contact.trim(),
        bloodGroup: form.blood,
        address: form.address.trim()

      };

      const response = isExisting
        ? await updateApiPatient(form._id, patientData)
        : await createApiPatient(patientData);

      if (!response.success) {
        throw new Error(response.message || "Registration failed");
      }

      toast(
        isExisting
          ? "Patient records updated successfully!"
          : "Patient registered successfully!",
        "success"
      );
      setSubmitted(true);

    } catch (error) {
      console.error("Patient registration error:", error);
      toast(
        error.message || "Unable to register patient",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };


  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-slide-up">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-4xl">✅</div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{isExisting ? "Patient Updated!" : "Patient Added!"}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">{form.name}'s records have been {isExisting ? "updated" : "registered"} in the OPD system.</p>
        <div className="flex gap-3 mt-2">
          <button onClick={() => navigate("/")} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all">View All Patients</button>
          <button onClick={() => { setSubmitted(false); setStep(0); setIsExisting(false); setForm({ name: "", age: "", gender: "Male", blood: "", contact: "", address: "" }); }} className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-5 py-2.5 rounded-xl transition-all">Add Another</button>
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
          <button
            type="submit"
            disabled={lookupLoading}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {lookupLoading ? "Searching..." : "Continue →"}
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
              <select name="gender" required onChange={handleChange} value={form.gender} className={inputCls}>
                {GENDERS.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Blood Group">
              <select name="blood" onChange={handleChange} value={form.blood} className={inputCls}>
                <option value="">Not specified</option>
                {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
              </select>
            </Field>

            <Field label="Address">
              <input
                name="address"
                placeholder="Enter patient address"
                onChange={handleChange}
                value={form.address}
                className={inputCls}
              />
            </Field>
          </div>
        </div>



        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => setStep(0)} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all">Cancel</button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading
              ? "Registering..."
              : isExisting
                ? "💾 Update Records"
                : "➕ Register Patient"}
          </button>
        </div>
      </form>
    </div>
  );
}