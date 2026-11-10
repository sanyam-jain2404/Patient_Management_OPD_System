import { useEffect, useMemo, useState } from "react";
import { fetchDepartments, fetchDoctors } from "../services/apiService";

const departmentDetails = {
  "General Medicine": {
    icon: "🩺",
    color: "from-sky-500 to-blue-600",
    services: ["General health checkups", "Fever and infections", "Diabetes and blood pressure care", "Preventive healthcare"],
  },
  Cardiology: {
    icon: "❤️",
    color: "from-rose-500 to-red-600",
    services: ["Heart health consultations", "Blood pressure evaluation", "Cardiovascular risk assessment", "Heart disease follow-ups"],
  },
  Dermatology: {
    icon: "🧴",
    color: "from-fuchsia-500 to-purple-600",
    services: ["Skin conditions", "Hair and scalp concerns", "Acne and allergy consultations", "Nail disorders"],
  },
  Orthopedic: {
    icon: "🦴",
    color: "from-amber-500 to-orange-600",
    services: ["Bone and joint pain", "Sports injuries", "Fracture follow-ups", "Muscle and ligament concerns"],
  },
  Neurology: {
    icon: "🧠",
    color: "from-violet-500 to-indigo-600",
    services: ["Headache consultations", "Nerve-related conditions", "Seizure follow-ups", "Brain and spine care"],
  },
  Pediatrics: {
    icon: "🧸",
    color: "from-emerald-500 to-teal-600",
    services: ["Child health checkups", "Growth and development", "Childhood infections", "Vaccination guidance"],
  },
  ENT: {
    icon: "👂",
    color: "from-cyan-500 to-teal-600",
    services: ["Ear problems", "Sinus and nasal conditions", "Throat concerns", "Hearing-related consultations"],
  },
  Gynecology: {
    icon: "🌸",
    color: "from-pink-500 to-rose-600",
    services: ["Women's health consultations", "Menstrual health", "Reproductive health", "Pregnancy-related consultations"],
  },
};

const fallbackDetails = {
  icon: "🏥",
  color: "from-indigo-500 to-blue-600",
  services: ["Specialist consultation", "Diagnosis and evaluation", "Treatment guidance", "Follow-up care"],
};

export default function DepartmentDirectory() {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDirectory = async () => {
      try {
        setLoading(true);
        setError("");
        const [departmentResponse, doctorResponse] = await Promise.all([
          fetchDepartments(),
          fetchDoctors(),
        ]);
        setDepartments(departmentResponse.data || []);
        setDoctors(doctorResponse.data || []);
      } catch (err) {
        setError("Unable to load the department directory. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };
    loadDirectory();
  }, []);

  const filteredDepartments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return departments.filter((department) => {
      const matchesSearch = !term ||
        department.name?.toLowerCase().includes(term) ||
        department.description?.toLowerCase().includes(term);
      const matchesSelection = selectedDepartment === "all" || department._id === selectedDepartment;
      return matchesSearch && matchesSelection;
    });
  }, [departments, search, selectedDepartment]);

  const getDepartmentDoctors = (departmentId) =>
    doctors.filter((doctor) => doctor.departmentId?._id === departmentId || doctor.departmentId === departmentId);

  return (
    <div className="max-w-7xl mx-auto space-y-7">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-7 sm:p-10 text-white shadow-xl">
        <div className="absolute -right-12 -top-16 h-64 w-64 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">OPD services</p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">Department Directory</h1>
          <p className="mt-3 text-sm sm:text-base leading-7 text-blue-100">Explore hospital departments, specialist services and available doctors — all in one place.</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">{departments.length} Departments</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">{doctors.length} Verified Doctors</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Find a department</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Search by department name or the care you need.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <div className="relative sm:min-w-72">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search departments..." className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
          </div>
          <select value={selectedDepartment} onChange={(event) => setSelectedDepartment(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <option value="all">All departments</option>
            {departments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}
          </select>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-80 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>
      ) : filteredDepartments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <div className="text-4xl">🔎</div>
          <h3 className="mt-3 font-semibold text-slate-800 dark:text-white">No departments found</h3>
          <p className="mt-1 text-sm text-slate-500">Try another search term or choose all departments.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredDepartments.map((department) => {
            const details = departmentDetails[department.name] || fallbackDetails;
            const departmentDoctors = getDepartmentDoctors(department._id);
            return (
              <article key={department._id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <div className={`flex items-center justify-between bg-gradient-to-r ${details.color} px-5 py-5 text-white`}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl backdrop-blur">{details.icon}</div>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">{departmentDoctors.length} {departmentDoctors.length === 1 ? "Doctor" : "Doctors"}</span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{department.name}</h3>
                  <p className="mt-2 min-h-10 text-sm leading-6 text-slate-500 dark:text-slate-400">{department.description || "Specialist consultations and patient care."}</p>

                  <div className="mt-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Specializations & services</h4>
                    <ul className="mt-3 space-y-2">
                      {details.services.map((service) => (
                        <li key={service} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"><span className="mt-0.5 text-emerald-500">✓</span>{service}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">OPD timings</span>
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">Confirm with doctor</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Timings depend on each doctor's availability. Check the booking page for current slots.</p>
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Available doctors</h4>
                    {departmentDoctors.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {departmentDoctors.slice(0, 3).map((doctor) => (
                          <div key={doctor._id} className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{doctor.userId?.name?.charAt(0)?.toUpperCase() || "D"}</div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">Dr. {doctor.userId?.name || "Doctor"}</p>
                              <p className="truncate text-xs text-slate-500">{doctor.specialization} · {doctor.experience || 0} yrs experience</p>
                            </div>
                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${doctor.isAvailable ? "bg-emerald-500" : "bg-slate-300"}`} title={doctor.isAvailable ? "Available" : "Unavailable"} />
                          </div>
                        ))}
                        {departmentDoctors.length > 3 && <p className="text-xs font-medium text-indigo-600 dark:text-indigo-300">+{departmentDoctors.length - 3} more doctors</p>}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No verified doctors listed yet.</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="text-xs leading-5 text-slate-400">Services shown are general department information. Actual services and appointment availability should be confirmed with the hospital.</p>
    </div>
  );
}
