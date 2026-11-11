
import { useEffect, useState } from "react";
import { fetchActivities } from "../services/apiService";

const CATEGORIES = ["All", "Admission", "Discharge", "System"];

function timeAgo(dateStr) {
  if (!dateStr) return "—";

  const d = new Date(dateStr);
  const diff = (Date.now() - d) / 1000;

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short"
  });
}

function TimelineEvent({ event }) {
  const dotColor =
    event.type === "admission"
      ? "bg-indigo-500"
      : event.type === "discharge"
      ? "bg-rose-500"
      : "bg-slate-400";

  const labelColor =
    event.type === "admission"
      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
      : event.type === "discharge"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

  return (
    <div className="flex gap-4 animate-fade-in">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${dotColor} mt-1.5 shrink-0 ring-4 ring-white dark:ring-slate-900`} />
        <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />
      </div>

      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {event.icon} {event.name}
            </p>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {event.subtitle}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${labelColor}`}>
              {event.label}
            </span>

            <span className="text-xs text-slate-400">
              {timeAgo(event.date)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Activity() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetchActivities();
        setEvents(response.data || []);
      } catch (err) {
        console.error("Activity loading error:", err);
        setError("Unable to load activities. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const admissions = events.filter(
    event => event.category === "Admission"
  ).length;

  const discharges = events.filter(
    event => event.category === "Discharge"
  ).length;

  const filtered =
    filter === "All"
      ? events
      : events.filter(event => event.category === filter);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Activity Timeline
          </h1>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            {events.length} total event{events.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-2">
          <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-3 py-1.5 rounded-full">
            ➕ {admissions} Admissions
          </span>

          <span className="text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 px-3 py-1.5 rounded-full">
            🚪 {discharges} Discharges
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                filter === category
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">

        {loading ? (
          <div className="text-center py-16 text-slate-500">
            Loading activities...
          </div>
        ) : error ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-rose-500">{error}</p>

            <button
              onClick={() => window.location.reload()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <span className="text-5xl">📋</span>

            <p className="font-semibold">
              No activity yet
            </p>

            <p className="text-sm">
              Activities will appear here as appointments and consultations are processed.
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((event, index) => (
              <div
                key={event.id}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <TimelineEvent event={event} />
              </div>
            ))}

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600" />
              </div>

              <p className="text-xs text-slate-400 pb-2">
                End of activity log
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
