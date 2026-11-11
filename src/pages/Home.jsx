
import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchApiPatients,
  fetchDoctorPatients
} from "../services/apiService";

const PAGE_SIZE = 8;

function avatarColor(name = "") {
  const colors = [
    "from-indigo-500 to-indigo-600",
    "from-violet-500 to-violet-600",
    "from-emerald-500 to-emerald-600",
    "from-rose-500 to-rose-600",
    "from-amber-500 to-amber-600",
    "from-cyan-500 to-cyan-600",
  ];

  let hash = 0;

  for (let c of name) {
    hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  }

  return colors[Math.abs(hash) % colors.length];
}

function StatusBadge({ priority }) {
  const map = {
    Critical: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    High: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    Medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    Low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  };

  return (
    <span
      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
        map[priority] || map.Low
      }`}
    >
      {priority || "Low"}
    </span>
  );
}

function formatDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export default function PatientList() {
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [docFilter, setDocFilter] = useState("All Departments");
  const [sortKey, setSortKey] = useState("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const role = user?.role?.toLowerCase();
  const isAdmin = role === "admin";
  const isDoctor = role === "doctor";

  // Fetch patients according to logged-in role
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let response;

      if (isDoctor) {
        response = await fetchDoctorPatients();
      } else if (isAdmin) {
        response = await fetchApiPatients();
      } else {
        throw new Error("You are not authorized to view this page.");
      }

      const patientList = (response.data || []).map((p) => ({
        ...p,
        id: p._id || p.id,
        name: p.name || "Unknown Patient",
        contact: p.contact || p.phone || "—",
        disease: p.disease || p.medicalHistory || "—",
        doctor: isDoctor ? "Assigned to You" : (p.doctor || "—"),
        department: p.department || "Unknown Department",
        date: p.date || p.createdAt || "",
        priority: p.priority || "Low",
        age: p.age ?? "—"
      }));

      setPatients(patientList);
      setPage(1);

    } catch (err) {
      console.error("Patient list error:", err);
      setError(
        err.message || "Unable to load patients. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [isDoctor, isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dynamic department options from backend data
  const departments = useMemo(() => {
    const names = [
      ...new Set(
        patients
          .map((p) => p.department?.trim())
          .filter(
            (department) =>
              department &&
              department !== "Unknown Department"
          )
      )
    ].sort((a, b) => a.localeCompare(b));

    return ["All Departments", ...names];
  }, [patients]);

  // Search + Department filtering + Sorting
  const filtered = useMemo(() => {
    let list = patients.filter((p) => {
      const q = search.toLowerCase();

      const matchesSearch =
        p.name?.toLowerCase().includes(q) ||
        p.disease?.toLowerCase().includes(q) ||
        p.contact?.toString().includes(q);

      const matchesDepartment =
        docFilter === "All Departments" ||
        p.department?.trim().toLowerCase() ===
          docFilter.trim().toLowerCase();

      return matchesSearch && matchesDepartment;
    });

    list.sort((a, b) => {
      const av = (a[sortKey] ?? "").toString().toLowerCase();
      const bv = (b[sortKey] ?? "").toString().toLowerCase();

      return sortAsc
        ? av.localeCompare(bv, undefined, { numeric: true })
        : bv.localeCompare(av, undefined, { numeric: true });
    });

    return list;
  }, [patients, search, docFilter, sortKey, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const paginated = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }

    setPage(1);
  };

  const SortIcon = ({ k }) => (
    <span
      className={`ml-1 text-xs ${
        sortKey === k ? "text-indigo-400" : "text-slate-500"
      }`}
    >
      {sortKey === k ? (sortAsc ? "↑" : "↓") : "⇅"}
    </span>
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Loading patients...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <span className="text-5xl">⚠️</span>

        <p className="text-rose-500 font-semibold">{error}</p>

        <button
          onClick={loadData}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isAdmin && !isDoctor) {
    return (
      <div className="text-center py-20 text-rose-500">
        You are not authorized to view patients.
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            All Patients
          </h1>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} patient{filtered.length !== 1 ? "s" : ""} in OPD
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => navigate("/add")}
            className="self-start sm:self-auto inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow transition-all hover:shadow-indigo-500/30 hover:scale-105 active:scale-95"
          >
            ➕ Add Patient
          </button>
        )}
      </div>

      {/* Search + Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>

          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, disease, contact..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <select
          value={docFilter}
          onChange={(e) => {
            setDocFilter(e.target.value);
            setPage(1);
          }}
          className="py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        >
          {departments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
      </div>

      {/* Empty State */}
      {paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-6xl">🏥</span>

          <p className="font-semibold text-lg">
            {patients.length === 0
              ? "No patients yet"
              : "No matches found"}
          </p>

          <p className="text-sm">
            {patients.length === 0
              ? "Patients with assigned appointments will appear here."
              : "Try a different search or filter."}
          </p>

          {patients.length === 0 && isAdmin && (
            <button
              onClick={() => navigate("/add")}
              className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
            >
              ➕ Add First Patient
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  {[
                    { key: "name", label: "Patient" },
                    { key: "disease", label: "Disease" },
                    { key: "doctor", label: "Doctor" },
                    { key: "date", label: "Admitted" },
                    { key: "age", label: "Age" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none transition-colors"
                    >
                      {col.label}
                      <SortIcon k={col.key} />
                    </th>
                  ))}

                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Priority
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginated.map((p, i) => {
                  const initials = p.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors animate-fade-in"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(p.name)} text-white text-sm font-bold flex items-center justify-center shrink-0`}
                          >
                            {initials}
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">
                              {p.name}
                            </p>

                            <p className="text-xs text-slate-400">
                              {p.contact}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {p.disease}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {p.doctor}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(p.date)}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {p.age === "—" ? "—" : `${p.age} yrs`}
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge priority={p.priority} />
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/patient/${p.id}`)}
                            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-2.5 py-1 rounded-lg transition-all"
                          >
                            👁 View
                          </button>

                          {p.canDischarge && (
                            <button
                              onClick={() => navigate(`/leave/${p.id}`)}
                              className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 px-2.5 py-1 rounded-lg transition-all"
                            >
                              🚪 Discharge
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {paginated.map((p, i) => {
              const initials = p.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={p.id}
                  className="p-4 animate-fade-in"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(p.name)} text-white font-bold flex items-center justify-center shrink-0`}
                    >
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-white truncate">
                        {p.name}
                      </p>

                      <p className="text-xs text-slate-400">
                        {p.disease} · {p.doctor}
                      </p>
                    </div>

                    <StatusBadge priority={p.priority} />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/patient/${p.id}`)}
                      className="flex-1 text-xs font-medium text-center py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all"
                    >
                      👁 View
                    </button>

                    {p.canDischarge && (
                      <button
                        onClick={() => navigate(`/leave/${p.id}`)}
                        className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 px-2.5 py-1 rounded-lg transition-all"
                      >
                        🚪 Discharge
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length}
              </p>

              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  ← Prev
                </button>

                {Array.from(
                  { length: totalPages },
                  (_, i) => i + 1
                ).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                      n === page
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {n}
                  </button>
                ))}

                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
