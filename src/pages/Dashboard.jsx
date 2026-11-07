import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import { fetchAppointments, updateAppointmentStatus, recordConsultation } from "../services/apiService";

function StatCard({ title, value, icon, subtext, colorClass }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${colorClass}`}>
          {icon}
        </div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
      </div>
      <p className="text-3xl font-extrabold text-slate-800 dark:text-white">{value}</p>
      {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
    </div>
  );
}

function PatientDashboard({ appointments }) {
  const navigate = useNavigate();
  const nextAppt = appointments.find(a => ["Booked", "Waiting", "In Consultation"].includes(a.status));

  return (
    <div className="space-y-6">
      {nextAppt ? (
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl">🏥</div>
          <div className="relative z-10">
            <h2 className="text-sm font-bold uppercase tracking-widest text-indigo-200 mb-2">Current Appointment</h2>
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              <div className="flex-1">
                <p className="text-4xl font-black mb-2">Token #{nextAppt.tokenNumber}</p>
                <p className="text-lg font-medium text-indigo-100">Dr. {nextAppt.doctorId.userId.name}</p>
                <p className="text-sm text-indigo-200">{nextAppt.departmentId.name} · {nextAppt.appointmentDate}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 min-w-[200px]">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-1">Queue Status</p>
                <p className="text-2xl font-bold">{nextAppt.status}</p>
                <p className="text-xs text-indigo-200 mt-1">Est. Wait: {nextAppt.estimatedWaitMinutes} mins</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
          <p className="text-slate-500 dark:text-slate-400 mb-4">You have no upcoming appointments.</p>
          <button
            onClick={() => navigate("/book")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition-all"
          >
            Book Now
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Your Appointment History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="pb-3 px-2">Date</th>
                <th className="pb-3 px-2">Doctor</th>
                <th className="pb-3 px-2">Token</th>
                <th className="pb-3 px-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {appointments.map(appt => (
                <tr key={appt._id} className="text-sm">
                  <td className="py-4 px-2 text-slate-600 dark:text-slate-300">{appt.appointmentDate}</td>
                  <td className="py-4 px-2 font-medium text-slate-800 dark:text-slate-100">Dr. {appt.doctorId.userId.name}</td>
                  <td className="py-4 px-2 text-slate-500">#{appt.tokenNumber}</td>
                  <td className="py-4 px-2">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      appt.status === "Completed" ? "bg-emerald-100 text-emerald-600" :
                      appt.status === "Cancelled" ? "bg-rose-100 text-rose-600" :
                      "bg-indigo-100 text-indigo-600"
                    }`}>{appt.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {appointments.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">No history found.</p>}
        </div>
      </div>
    </div>
  );
}

function DoctorDashboard({ appointments, onStatusUpdate }) {
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [consultationForm, setConsultationForm] = useState({
    diagnosis: "",
    treatment: "",
    notes: "",
    medicines: [{ name: "", dosage: "", duration: "" }],
    followUpDate: ""
  });

  const waitingQueue = appointments.filter(a => ["Booked", "Waiting", "In Consultation"].includes(a.status))
    .sort((a, b) => a.tokenNumber - b.tokenNumber);

  const currentPatient = waitingQueue.find(a => a.status === "In Consultation");
  const nextUp = waitingQueue.find(a => a.status !== "In Consultation");

  const handleConsultationChange = (e) => setConsultationForm({ ...consultationForm, [e.target.name]: e.target.value });

  const addMedicine = () => {
    setConsultationForm({
      ...consultationForm,
      medicines: [...consultationForm.medicines, { name: "", dosage: "", duration: "" }]
    });
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = [...consultationForm.medicines];
    updated[index][field] = value;
    setConsultationForm({ ...consultationForm, medicines: updated });
  };

  const submitConsultation = async (e) => {
    e.preventDefault();
    try {
      await recordConsultation({
        appointmentId: currentPatient._id,
        ...consultationForm
      });
      setActiveConsultation(null);
      setConsultationForm({ diagnosis: "", treatment: "", notes: "", medicines: [{ name: "", dosage: "", duration: "" }], followUpDate: "" });
      onStatusUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Queue Sidebar */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center justify-between">
            <span>Patient Queue</span>
            <span className="bg-indigo-100 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full">{waitingQueue.length} Waiting</span>
          </h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {waitingQueue.map(appt => (
              <div key={appt._id} className={`p-4 rounded-xl border transition-all ${appt.status === "In Consultation" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-indigo-500">TOKEN #{appt.tokenNumber}</span>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${appt.status === "In Consultation" ? "bg-indigo-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>{appt.status}</span>
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{appt.patientId.name}</p>
                <p className="text-xs text-slate-500 mt-1">{appt.patientId.age}y · {appt.patientId.gender}</p>
                {appt.status !== "In Consultation" && (
                  <button
                    onClick={() => onStatusUpdate(appt._id, "In Consultation")}
                    className="mt-3 w-full py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-600 rounded-lg hover:bg-indigo-500 hover:text-white transition-all"
                  >
                    Start Consultation
                  </button>
                )}
              </div>
            ))}
            {waitingQueue.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">No patients in queue.</p>}
          </div>
        </div>
      </div>

      {/* Main Console */}
      <div className="lg:col-span-2">
        {currentPatient ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in">
            <div className="bg-indigo-600 p-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80">Now Consulting</p>
                  <h2 className="text-2xl font-bold">{currentPatient.patientId.name}</h2>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black">#{currentPatient.tokenNumber}</p>
                  <p className="text-xs opacity-80">OPD Token</p>
                </div>
              </div>
            </div>

            <form onSubmit={submitConsultation} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Diagnosis</label>
                  <input
                    name="diagnosis" required placeholder="e.g. Acute Viral Fever"
                    value={consultationForm.diagnosis} onChange={handleConsultationChange}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Follow-up Date</label>
                  <input
                    type="date" name="followUpDate"
                    value={consultationForm.followUpDate} onChange={handleConsultationChange}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Treatment/Plan</label>
                <textarea
                  name="treatment" rows={2} placeholder="Summary of treatment provided..."
                  value={consultationForm.treatment} onChange={handleConsultationChange}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Prescription</label>
                  <button type="button" onClick={addMedicine} className="text-xs font-bold text-indigo-500 hover:underline">+ Add Medicine</button>
                </div>
                <div className="space-y-3">
                  {consultationForm.medicines.map((med, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2">
                      <input
                        placeholder="Medicine Name" value={med.name}
                        onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none"
                      />
                      <input
                        placeholder="Dosage (e.g. 1-0-1)" value={med.dosage}
                        onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none"
                      />
                      <input
                        placeholder="Duration (e.g. 5 days)" value={med.duration}
                        onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all"
                >
                  Complete Consultation & Save
                </button>
                <button
                  type="button"
                  onClick={() => onStatusUpdate(currentPatient._id, "No Show")}
                  className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Mark No Show
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center animate-fade-in">
            <div className="text-6xl mb-6">🩺</div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Ready to see patients?</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">Click "Start Consultation" on a patient in the queue to begin recording their medical notes.</p>
            {nextUp && (
              <button
                onClick={() => onStatusUpdate(nextUp._id, "In Consultation")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-2xl transition-all shadow-lg shadow-indigo-500/25"
              >
                Call Next Patient: {nextUp.patientId.name}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard({ appointments }) {
  const navigate = useNavigate();
  const today = appointments.filter(a => a.appointmentDate === new Date().toISOString().slice(0, 10));

  const stats = {
    total: appointments.length,
    today: today.length,
    waiting: today.filter(a => ["Booked", "Waiting"].includes(a.status)).length,
    completed: appointments.filter(a => a.status === "Completed").length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Appointments" value={stats.total} icon="📅" colorClass="bg-indigo-100 text-indigo-600" />
        <StatCard title="Today's Queue" value={stats.today} icon="👥" colorClass="bg-violet-100 text-violet-600" />
        <StatCard title="Waiting Now" value={stats.waiting} icon="🕒" colorClass="bg-amber-100 text-amber-600" />
        <StatCard title="Completed" value={stats.completed} icon="✅" colorClass="bg-emerald-100 text-emerald-600" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 dark:text-white">Recent Appointments</h3>
          <button onClick={() => navigate("/")} className="text-xs font-bold text-indigo-500 hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/30">
                <th className="py-3 px-5">Patient</th>
                <th className="py-3 px-5">Doctor</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Token</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {appointments.slice(0, 10).map(appt => (
                <tr key={appt._id} className="text-sm">
                  <td className="py-4 px-5">
                    <p className="font-bold text-slate-800 dark:text-slate-100">{appt.patientId?.name || "Unknown"}</p>
                    <p className="text-[10px] text-slate-400">{appt.appointmentDate}</p>
                  </td>
                  <td className="py-4 px-5 text-slate-600 dark:text-slate-400">Dr. {appt.doctorId?.userId?.name}</td>
                  <td className="py-4 px-5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      appt.status === "Completed" ? "bg-emerald-100 text-emerald-600" :
                      appt.status === "Cancelled" ? "bg-rose-100 text-rose-600" :
                      "bg-amber-100 text-amber-600"
                    }`}>{appt.status}</span>
                  </td>
                  <td className="py-4 px-5 font-mono text-slate-400">#{appt.tokenNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {appointments.length === 0 && <p className="text-center py-12 text-slate-400 text-sm">No appointments found.</p>}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const loadData = async () => {
    try {
      const data = await fetchAppointments();
      setAppointments(data.data);
    } catch (err) {
      toast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (apptId, status) => {
    try {
      await updateAppointmentStatus(apptId, { status });
      toast(`Status updated to ${status}`, "success");
      loadData();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Welcome back, <span className="font-bold text-indigo-500">{user.name}</span></p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('en-IN', { weekday: 'long' })}</p>
          <p className="text-sm font-bold text-slate-800 dark:text-white">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      {user.role === "admin" && <AdminDashboard appointments={appointments} />}
      {user.role === "doctor" && <DoctorDashboard appointments={appointments} onStatusUpdate={handleStatusUpdate} />}
      {user.role === "patient" && <PatientDashboard appointments={appointments} />}
    </div>
  );
}
