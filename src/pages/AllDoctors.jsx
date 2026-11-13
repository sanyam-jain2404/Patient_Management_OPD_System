
import { useEffect, useState } from "react";
import { fetchDoctors, fetchDepartments, updateDoctor } from "../services/apiService";


export default function AllDoctors() {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [department, setDepartment] = useState("All");
    const [departmentList, setDepartmentList] = useState([]);

    const [editingDoctor, setEditingDoctor] = useState(null);
    const [editForm, setEditForm] = useState({
        specialization: "",
        qualification: "",
        experience: "",
        departmentId: ""
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadDoctors = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await fetchDoctors();
                setDoctors(response.data || []);
            } catch (err) {
                console.error("Doctors loading error:", err);
                setError("Unable to load doctors.");
            } finally {
                setLoading(false);
            }
        };

        const loadDepartments = async () => {
            try {
                const response = await fetchDepartments();
                setDepartmentList(response.data || []);
            } catch (err) {
                console.error("Departments loading error:", err);
            }
        };

        loadDoctors();
        loadDepartments();
    }, []);

    const departments = [
        "All",
        ...new Set(
            doctors.map((doctor) => doctor.departmentId?.name).filter(Boolean)
        )
    ];

    const filteredDoctors = doctors.filter((doctor) => {
        const name = doctor.userId?.name || "";
        const email = doctor.userId?.email || "";
        const specialization = doctor.specialization || "";
        const departmentName = doctor.departmentId?.name || "";

        const matchesSearch = [
            name,
            email,
            specialization
        ].some((value) =>
            value.toLowerCase().includes(search.toLowerCase())
        );

        const matchesDepartment =
            department === "All" || departmentName === department;

        return matchesSearch && matchesDepartment;
    });

    // Open Edit Modal
    const handleEdit = (doctor) => {
        setEditingDoctor(doctor);

        setEditForm({
            specialization: doctor.specialization || "",
            qualification: doctor.qualification || "",
            experience: doctor.experience ?? "",
            departmentId: doctor.departmentId?._id || ""
        });
    };

    // Update Doctor Details
    const handleUpdate = async (e) => {
        e.preventDefault();

        try {
            setSaving(true);

            const response = await updateDoctor(editingDoctor._id, {
                ...editForm,
                experience: Number(editForm.experience)
            });

            setDoctors((prev) =>
                prev.map((doctor) =>
                    doctor._id === editingDoctor._id
                        ? response.data
                        : doctor
                )
            );

            setEditingDoctor(null);
            alert("Doctor details updated successfully!");
        } catch (error) {
            console.error("Update doctor error:", error);
            alert("Failed to update doctor details.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-20 text-slate-500">
                Loading doctors...
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                    All Doctors
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    View and manage approved doctors in the OPD system.
                </p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">
                        Total Approved Doctors
                    </p>
                    <h2 className="text-3xl font-bold text-indigo-600 mt-2">
                        {doctors.length}
                    </h2>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                    <p className="text-sm text-slate-500">
                        Available Doctors
                    </p>
                    <h2 className="text-3xl font-bold text-emerald-600 mt-2">
                        {doctors.filter((doctor) => doctor.isAvailable).length}
                    </h2>
                </div>

            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3">

                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by doctor name, email or specialization..."
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none"
                >
                    {departments.map((item) => (
                        <option key={item} value={item}>
                            {item === "All" ? "All Departments" : item}
                        </option>
                    ))}
                </select>

            </div>

            {error && (
                <p className="text-rose-500 text-center py-6">{error}</p>
            )}

            {/* Doctor Cards */}
            {!error && filteredDoctors.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800">
                    <p className="text-slate-500">
                        No doctors found.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                    {filteredDoctors.map((doctor) => (
                        <div
                            key={doctor._id}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
                        >

                            <div className="flex items-start justify-between gap-3">

                                <div className="flex items-center gap-3 min-w-0">

                                    <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-xl shrink-0">
                                        👨‍⚕️
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-800 dark:text-white truncate">
                                            {doctor.userId?.name || "Doctor"}
                                        </h3>

                                        <p className="text-xs text-slate-500 truncate">
                                            {doctor.userId?.email}
                                        </p>
                                    </div>

                                </div>

                                <span
                                    className={`text-xs px-2 py-1 rounded-full font-semibold shrink-0 ${doctor.isAvailable
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-rose-100 text-rose-700"
                                        }`}
                                >
                                    {doctor.isAvailable ? "Available" : "Unavailable"}
                                </span>

                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800 mt-5 pt-4 space-y-3">

                                <div>
                                    <p className="text-xs text-slate-400">
                                        Department
                                    </p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        {doctor.departmentId?.name || "Not assigned"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400">
                                        Specialization
                                    </p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        {doctor.specialization}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">

                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Qualification
                                        </p>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                            {doctor.qualification || "—"}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Experience
                                        </p>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                            {doctor.experience} years
                                        </p>
                                    </div>

                                </div>

                            </div>

                            {/* Step 4: Edit Doctor Button */}
                            <button
                                onClick={() => handleEdit(doctor)}
                                className="w-full mt-5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                            >
                                ✏️ Edit Doctor
                            </button>

                        </div>
                    ))}

                </div>
            )}

            <p className="text-xs text-slate-400 text-right">
                Showing {filteredDoctors.length} of {doctors.length} doctors
            </p>

            {/* Step 5: Edit Doctor Modal */}
            {editingDoctor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

                    <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto">

                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                    Edit Doctor Details
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    {editingDoctor.userId?.name}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setEditingDoctor(null)}
                                className="text-slate-500 hover:text-rose-500 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-4">

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Specialization
                                </label>
                                <input
                                    type="text"
                                    value={editForm.specialization}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            specialization: e.target.value
                                        })
                                    }
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Qualification
                                </label>
                                <input
                                    type="text"
                                    value={editForm.qualification}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            qualification: e.target.value
                                        })
                                    }
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Experience (Years)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={editForm.experience}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            experience: e.target.value
                                        })
                                    }
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Department
                                </label>

                                <select
                                    value={editForm.departmentId}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            departmentId: e.target.value
                                        })
                                    }
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                >
                                    <option value="">Select Department</option>

                                    {departmentList.map((dept) => (
                                        <option key={dept._id} value={dept._id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-3">

                                <button
                                    type="button"
                                    onClick={() => setEditingDoctor(null)}
                                    disabled={saving}
                                    className="rounded-lg border border-slate-300 dark:border-slate-700 px-5 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-lg bg-indigo-600 px-5 py-2.5 text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>

                            </div>

                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
