
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import {
  fetchApiPatients,
  fetchDepartments,
  bookAppointment,
} from "../services/apiService";

const inputCls =
  "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

const today = new Date().toLocaleDateString("en-CA");

export default function AdminBookAppointment() {
  const navigate = useNavigate();
  const toast = useToast();

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [patients, setPatients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [loadingData, setLoadingData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [form, setForm] = useState({
    departmentId: "",
    date: today,
    time: "09:00",
    symptoms: "",
    reason: "",
    priority: "Normal",
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [patientResponse, departmentResponse] =
          await Promise.all([
            fetchApiPatients(),
            fetchDepartments(),
          ]);

        setPatients(patientResponse.data || []);

        const departmentList = departmentResponse.data || [];
        setDepartments(departmentList);

        if (departmentList.length > 0) {
          setForm((prev) => ({
            ...prev,
            departmentId: departmentList[0]._id,
          }));
        }
      } catch (error) {
        toast(error.message || "Unable to load data", "error");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [toast]);

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return [];

    return patients.filter(
      (patient) =>
        patient.name?.toLowerCase().includes(query) ||
        patient.phone?.includes(query)
    );
  }, [patients, search]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (user.role !== "admin") {
      toast("Only admin can book for patients.", "error");
      return;
    }

    if (!selectedPatient) {
      toast("Please select a patient first.", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await bookAppointment({
        ...form,
        patientId: selectedPatient._id,
      });

      if (!response.success) {
        throw new Error(response.message || "Booking failed");
      }

      setResult(response.data);
      toast(response.message || "Appointment booked successfully!", "success");
    } catch (error) {
      toast(error.message || "Booking failed", "error");
    } finally {
      setLoading(false);
    }
  };

  if (user.role !== "admin") {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold text-rose-500">
          Access Denied
        </h2>
        <p className="text-slate-500 mt-2">
          Only administrators can access this page.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-5 bg-indigo-600 text-white px-5 py-2 rounded-xl"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-xl">
          <div className="text-5xl mb-5">✅</div>

          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">
            Booking Confirmed!
          </h2>

          <p className="text-slate-500 mt-2">
            Appointment booked for {selectedPatient.name}.
          </p>

          <div className="mt-7 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-left space-y-3">
            <p>
              <strong>Patient:</strong> {selectedPatient.name}
            </p>
            <p>
              <strong>Doctor:</strong>{" "}
              Dr. {result.assignedDoctor?.name || "Assigned Doctor"}
            </p>
            <p>
              <strong>Token:</strong> #{result.tokenNumber}
            </p>
            <p>
              <strong>Waiting Time:</strong>{" "}
              {result.estimatedWaitMinutes ?? "N/A"} mins
            </p>
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            className="w-full mt-7 py-3 rounded-xl bg-indigo-600 text-white font-bold"
          >
            Go to Dashboard
          </button>

          <button
            onClick={() => {
              setResult(null);
              setSelectedPatient(null);
              setSearch("");
              setForm((prev) => ({
                ...prev,
                date: today,
                time: "09:00",
                symptoms: "",
                reason: "",
                priority: "Normal",
              }));
            }}
            className="w-full mt-3 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-bold"
          >
            Book Another Appointment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">
          Book Appointment for Patient
        </h1>
        <p className="text-slate-500 mt-2">
          Search and select a registered patient before booking.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-xl space-y-6">

        <div>
          <label className="block text-sm font-semibold mb-2 text-slate-600 dark:text-slate-300">
            Search Patient
          </label>

          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedPatient(null);
            }}
            placeholder="Enter patient name or phone number"
            className={inputCls}
          />

          {loadingData && (
            <p className="text-sm text-slate-500 mt-2">
              Loading patients...
            </p>
          )}

          {!loadingData && search.trim() && !selectedPatient && (
            <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <button
                    key={patient._id}
                    type="button"
                    onClick={() => {
                      setSelectedPatient(patient);
                      setSearch(`${patient.name} - ${patient.phone}`);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-slate-800 border-b last:border-b-0 border-slate-200 dark:border-slate-700"
                  >
                    <p className="font-semibold text-slate-800 dark:text-white">
                      {patient.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {patient.phone} · Age {patient.age} · {patient.gender}
                    </p>
                  </button>
                ))
              ) : (
                <p className="p-4 text-sm text-slate-500">
                  No patient found. Register the patient first.
                </p>
              )}
            </div>
          )}
        </div>

        {selectedPatient && (
          <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800">
            <div className="flex justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                  Selected Patient
                </p>
                <p className="font-bold text-slate-800 dark:text-white mt-1">
                  {selectedPatient.name}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {selectedPatient.phone} · Age {selectedPatient.age} · {selectedPatient.gender}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPatient(null);
                  setSearch("");
                }}
                className="text-sm text-rose-500 font-semibold"
              >
                Change
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-600 dark:text-slate-300">
                Department *
              </label>
              <select
                name="departmentId"
                required
                value={form.departmentId}
                onChange={handleChange}
                className={inputCls}
              >
                <option value="">Select Department</option>
                {departments.map((department) => (
                  <option key={department._id} value={department._id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-600 dark:text-slate-300">
                Priority
              </label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className={inputCls}
              >
                <option value="Normal">Normal</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-600 dark:text-slate-300">
                Appointment Date *
              </label>
              <input
                type="date"
                name="date"
                min={today}
                required
                value={form.date}
                onChange={handleChange}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-600 dark:text-slate-300">
                Preferred Time *
              </label>
              <input
                type="time"
                name="time"
                required
                value={form.time}
                onChange={handleChange}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-600 dark:text-slate-300">
              Symptoms / Brief Description *
            </label>
            <textarea
              name="symptoms"
              required
              rows={3}
              value={form.symptoms}
              onChange={handleChange}
              placeholder="Describe patient's symptoms..."
              className={inputCls + " resize-none"}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-600 dark:text-slate-300">
              Additional Reason
            </label>
            <input
              name="reason"
              value={form.reason}
              onChange={handleChange}
              placeholder="Optional"
              className={inputCls}
            />
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              loadingData ||
              !selectedPatient ||
              !form.departmentId
            }
            className="w-full py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Allocating Doctor..." : "Confirm Appointment"}
          </button>
        </form>
      </div>
    </div>
  );
}
