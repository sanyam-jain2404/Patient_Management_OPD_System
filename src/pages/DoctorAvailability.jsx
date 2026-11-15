import { useEffect, useState } from "react";
import { useToast } from "../components/ToastContext";
import {
  fetchMyDoctorAvailability,
  updateMyDoctorAvailability
} from "../services/apiService";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

const defaultSchedule = DAYS.map((_, dayOfWeek) => ({
  dayOfWeek,
  isWorking: dayOfWeek > 0 && dayOfWeek < 6,
  startTime: "09:00",
  endTime: "17:00",
  breakStart: "13:00",
  breakEnd: "14:00"
}));

const inputClass =
  "rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white";

export default function DoctorAvailability() {
  const toast = useToast();
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [exceptions, setExceptions] = useState([]);
  const [newException, setNewException] = useState({
    date: "",
    isAvailable: false,
    startTime: "09:00",
    endTime: "17:00",
    reason: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadAvailability = async () => {
      try {
        const response = await fetchMyDoctorAvailability();
        setSchedule(response.data?.weeklySchedule?.length
          ? response.data.weeklySchedule
          : defaultSchedule);
        setExceptions(response.data?.availabilityExceptions || []);
      } catch (error) {
        toast(error.message || "Unable to load availability.", "error");
      } finally {
        setLoading(false);
      }
    };

    loadAvailability();
  }, [toast]);

  const updateDay = (dayOfWeek, field, value) => {
    setSchedule((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day
      )
    );
  };

  const addException = () => {
    if (!newException.date) {
      toast("Choose a date for the exception.", "warning");
      return;
    }

    if (exceptions.some((item) => item.date === newException.date)) {
      toast("An exception already exists for this date.", "warning");
      return;
    }

    setExceptions((current) => [...current, newException]);
    setNewException({
      date: "",
      isAvailable: false,
      startTime: "09:00",
      endTime: "17:00",
      reason: ""
    });
  };

  const saveAvailability = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await updateMyDoctorAvailability({
        weeklySchedule: schedule,
        availabilityExceptions: exceptions
      });
      toast("Availability updated successfully.", "success");
    } catch (error) {
      toast(error.message || "Unable to update availability.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-24 text-center text-slate-500">Loading availability...</div>;
  }

  return (
    <form onSubmit={saveAvailability} className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">
          Doctor Availability
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Set your regular working hours and date-specific exceptions.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-slate-800 dark:text-white">Weekly schedule</h2>
        <div className="space-y-3">
          {DAYS.map((dayName, dayOfWeek) => {
            const day = schedule.find((item) => item.dayOfWeek === dayOfWeek)
              || defaultSchedule[dayOfWeek];

            return (
              <div
                key={dayName}
                className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 md:grid-cols-[140px_120px_1fr]"
              >
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={day.isWorking}
                    onChange={(event) => updateDay(dayOfWeek, "isWorking", event.target.checked)}
                  />
                  {dayName}
                </label>
                <span className="self-center text-xs text-slate-500">
                  {day.isWorking ? "Working" : "Unavailable"}
                </span>
                {day.isWorking && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <input className={inputClass} type="time" value={day.startTime} onChange={(event) => updateDay(dayOfWeek, "startTime", event.target.value)} aria-label={`${dayName} start time`} />
                    <input className={inputClass} type="time" value={day.endTime} onChange={(event) => updateDay(dayOfWeek, "endTime", event.target.value)} aria-label={`${dayName} end time`} />
                    <input className={inputClass} type="time" value={day.breakStart || ""} onChange={(event) => updateDay(dayOfWeek, "breakStart", event.target.value)} aria-label={`${dayName} break start`} />
                    <input className={inputClass} type="time" value={day.breakEnd || ""} onChange={(event) => updateDay(dayOfWeek, "breakEnd", event.target.value)} aria-label={`${dayName} break end`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Time fields are start, end, break start, and break end.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-slate-800 dark:text-white">Date exceptions</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[150px_150px_1fr_auto]">
          <input className={inputClass} type="date" value={newException.date} onChange={(event) => setNewException({ ...newException, date: event.target.value })} />
          <select className={inputClass} value={newException.isAvailable ? "available" : "unavailable"} onChange={(event) => setNewException({ ...newException, isAvailable: event.target.value === "available" })}>
            <option value="unavailable">Unavailable</option>
            <option value="available">Available</option>
          </select>
          <input className={inputClass} placeholder="Reason (optional)" value={newException.reason} onChange={(event) => setNewException({ ...newException, reason: event.target.value })} />
          <button type="button" onClick={addException} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-white">
            Add
          </button>
        </div>
        {exceptions.length > 0 && (
          <div className="mt-4 space-y-2">
            {exceptions.map((exception) => (
              <div key={exception.date} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
                <span className="text-slate-700 dark:text-slate-200">
                  {exception.date} — {exception.isAvailable ? "Available" : "Unavailable"}
                  {exception.reason ? ` (${exception.reason})` : ""}
                </span>
                <button type="button" onClick={() => setExceptions((current) => current.filter((item) => item.date !== exception.date))} className="text-rose-500 hover:text-rose-700">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white disabled:opacity-50">
        {saving ? "Saving..." : "Save Availability"}
      </button>
    </form>
  );
}
