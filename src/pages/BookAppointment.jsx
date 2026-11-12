
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import {
  fetchDepartments,
  bookAppointment,
  fetchMyFollowUps,
} from "../services/apiService";

function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
        {label}
        {required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";

export default function BookAppointment() {
  const navigate = useNavigate();
  const toast = useToast();

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [departments, setDepartments] = useState([]);
  const [followUps, setFollowUps] = useState([]);

  const [bookingType, setBookingType] = useState("Normal");
  const [selectedFollowUpId, setSelectedFollowUpId] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);

  const [form, setForm] = useState({
    departmentId: "",
    date: new Date().toISOString().slice(0, 10),
    time: "09:00",
    symptoms: "",
    reason: "",
    priority: "Normal",
  });

  const [result, setResult] = useState(null);

  // Load departments
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const data = await fetchDepartments();

        setDepartments(data.data || []);

        if (data.data?.length > 0) {
          setForm((prev) => ({
            ...prev,
            departmentId: prev.departmentId || data.data[0]._id,
          }));
        }
      } catch (err) {
        toast("Failed to load departments", "error");
      }
    };

    loadDepartments();
  }, [toast]);

  // Load patient's pending follow-ups
  useEffect(() => {
    const loadFollowUps = async () => {
      setLoadingFollowUps(true);

      try {
        const response = await fetchMyFollowUps();

        const pendingFollowUps = (response.data || []).filter(
          (item) =>
            ["Pending", "Reminder Sent"].includes(item.status) &&
            !item.appointmentId
        );

        setFollowUps(pendingFollowUps);
      } catch (err) {
        console.error("Failed to load follow-ups:", err);
        toast("Unable to load follow-ups", "error");
      } finally {
        setLoadingFollowUps(false);
      }
    };

    loadFollowUps();
  }, [toast]);

  // Normal form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Booking type change
  const handleBookingTypeChange = (e) => {
    const value = e.target.value;

    setBookingType(value);
    setSelectedFollowUpId("");

    if (value === "Normal") {
      setForm((prev) => ({
        ...prev,
        reason: "",
        symptoms: "",
      }));
    }
  };

  // Follow-up selection
  const handleFollowUpChange = (e) => {
    const id = e.target.value;

    setSelectedFollowUpId(id);

    const selected = followUps.find((item) => item._id === id);

    if (!selected) return;

    const consultation = selected.consultationId;
    const department = consultation?.departmentId;

    setForm((prev) => ({
      ...prev,

      departmentId:
        typeof department === "object" && department?._id
          ? department._id
          : prev.departmentId,

      date: selected.dueDate
        ? new Date(selected.dueDate).toISOString().slice(0, 10)
        : prev.date,

      symptoms: selected.instructions || "",

      reason: "Follow-up visit",
    }));
  };

  // Submit appointment
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user.id) {
      toast("Please login again.", "error");
      return;
    }

    if (bookingType === "Follow-up" && !selectedFollowUpId) {
      toast("Please select a follow-up.", "error");
      return;
    }

    setLoading(true);

    try {
      const appointmentData = {
        ...form,
        patientId: user.id,

        ...(bookingType === "Follow-up"
          ? { followUpId: selectedFollowUpId }
          : {}),
      };

      const response = await bookAppointment(appointmentData);

      setResult(response.data);

      toast(response.message || "Appointment booked successfully!", "success");
    } catch (err) {
      toast(err.message || "Booking failed", "error");
    } finally {
      setLoading(false);
    }
  };

  // Booking success screen
  if (result) {
    const selectedDepartment = departments.find(
      (d) => d._id === form.departmentId
    );

    return (
      <div className="max-w-xl mx-auto py-12 animate-slide-up">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-4xl mx-auto mb-6">
            ✅
          </div>

          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">
            Booking Confirmed!
          </h2>

          <p className="text-slate-500 dark:text-slate-400 mb-8">
            Your appointment has been scheduled successfully.
          </p>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 mb-8 grid grid-cols-2 gap-y-6 text-left border border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                Doctor
              </p>
              <p className="text-slate-800 dark:text-white font-semibold">
                Dr. {result.assignedDoctor?.name || "Assigned Doctor"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                Token Number
              </p>
              <p className="text-indigo-500 dark:text-indigo-400 font-bold text-xl">
                #{result.tokenNumber}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                Department
              </p>
              <p className="text-slate-800 dark:text-white font-semibold">
                {selectedDepartment?.name || "Department"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                Est. Waiting Time
              </p>
              <p className="text-slate-800 dark:text-white font-semibold">
                {result.estimatedWaitMinutes ?? "N/A"} mins
              </p>
            </div>
          </div>

          {bookingType === "Follow-up" && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-5 font-medium">
              Your follow-up appointment has been linked successfully.
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/")}
              className="w-full py-4 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
            >
              Go to Home
            </button>

            <button
              onClick={() => {
                setResult(null);
                setBookingType("Normal");
                setSelectedFollowUpId("");
                setForm((prev) => ({
                  ...prev,
                  symptoms: "",
                  reason: "",
                  date: new Date().toISOString().slice(0, 10),
                  time: "09:00",
                }));
              }}
              className="w-full py-4 rounded-2xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Book Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Appointment booking form
  return (
    <div className="max-w-2xl mx-auto py-8 animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">
          Book Appointment
        </h1>

        <p className="text-slate-500 dark:text-slate-400">
          Select a department and we'll automatically assign the best available
          doctor for you.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl space-y-6"
      >
        {/* Booking Type */}
        <Field label="Booking Type" required>
          <select
            value={bookingType}
            onChange={handleBookingTypeChange}
            className={inputCls}
          >
            <option value="Normal">Normal Appointment</option>
            <option value="Follow-up">Follow-up Appointment</option>
          </select>
        </Field>

        {/* Follow-up selector */}
        {bookingType === "Follow-up" && (
          <Field label="Select Pending Follow-up" required>
            <select
              value={selectedFollowUpId}
              onChange={handleFollowUpChange}
              required
              disabled={loadingFollowUps || followUps.length === 0}
              className={inputCls}
            >
              <option value="">
                {loadingFollowUps
                  ? "Loading follow-ups..."
                  : "Select Follow-up"}
              </option>

              {followUps.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.instructions} -{" "}
                  {new Date(item.dueDate).toLocaleDateString("en-IN")}
                </option>
              ))}
            </select>

            {!loadingFollowUps && followUps.length === 0 && (
              <p className="text-sm text-amber-500 mt-2">
                No pending follow-ups available.
              </p>
            )}
          </Field>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Department */}
          <Field label="Medical Department" required>
            <select
              name="departmentId"
              required
              value={form.departmentId}
              onChange={handleChange}
              disabled={
                bookingType === "Follow-up" && !!selectedFollowUpId
              }
              className={inputCls}
            >
              <option value="">Select Department</option>

              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </Field>

          {/* Priority */}
          <Field label="Priority Level">
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className={inputCls}
            >
              <option value="Normal">Normal</option>
              <option value="Emergency">Emergency (Priority)</option>
            </select>
          </Field>

          {/* Date */}
          <Field label="Preferred Date" required>
            <input
              type="date"
              name="date"
              required
              min={new Date().toISOString().slice(0, 10)}
              value={form.date}
              onChange={handleChange}
              className={inputCls}
            />
          </Field>

          {/* Time */}
          <Field label="Preferred Time" required>
            <input
              type="time"
              name="time"
              required
              value={form.time}
              onChange={handleChange}
              className={inputCls}
            />
          </Field>
        </div>

        {/* Symptoms */}
        <Field label="Symptoms / Brief Description" required>
          <textarea
            name="symptoms"
            required
            rows={3}
            placeholder="e.g. Fever for 2 days, persistent cough..."
            value={form.symptoms}
            onChange={handleChange}
            className={inputCls + " resize-none"}
          />
        </Field>

        {/* Reason */}
        <Field label="Additional Reason (Optional)">
          <input
            type="text"
            name="reason"
            placeholder="e.g. Follow-up visit"
            value={form.reason}
            onChange={handleChange}
            className={inputCls}
          />
        </Field>

        {/* Submit */}
        <button
          type="submit"
          disabled={
            loading ||
            !form.departmentId ||
            (bookingType === "Follow-up" && !selectedFollowUpId)
          }
          className="w-full py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.01] active:scale-[0.99] mt-4"
        >
          {loading
            ? "Allocating Best Doctor..."
            : "Confirm Booking →"}
        </button>
      </form>
    </div>
  );
}
