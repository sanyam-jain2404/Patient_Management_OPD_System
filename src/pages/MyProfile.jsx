import { useEffect, useState } from "react";
import {
    fetchMyPatientProfile,
    fetchPatientTreatmentHistory
} from "../services/apiService";

function ProfileField({ label, value, icon }) {
    return (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-xl">{icon}</span>
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {label}
                </p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1 break-words">
                    {value || "Not provided"}
                </p>
            </div>
        </div>
    );
}

export default function MyProfile() {
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {

        const loadProfile = async () => {
            const response = await fetchMyPatientProfile();
            setPatient(response.data);

            try {
                const historyResponse = await fetchPatientTreatmentHistory(
                    response.data._id
                );

                setHistory(historyResponse.data || []);
            } catch (historyError) {
                console.error("Treatment history error:", historyError);
                setHistory([]);
            } finally {
                setHistoryLoading(false);
            }
            try {
                setLoading(true);
                setError("");

                const response = await fetchMyPatientProfile();
                setPatient(response.data);
            } catch (err) {
                console.error("Profile loading error:", err);
                setError("Unable to load your profile. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-24 text-slate-500">
                Loading your profile...
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-24 space-y-4">
                <p className="text-rose-500">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-5 py-2 rounded-xl bg-indigo-600 text-white"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!patient) return null;

    const initials = patient.name
        ?.split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const dob = patient.dateOfBirth
        ? new Date(patient.dateOfBirth).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        })
        : "Not provided";

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">

            {/* Page Heading */}
            <div>
                <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">
                    My Profile
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    View your personal and medical information.
                </p>
            </div>

            {/* Profile Header */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">

                <div className="h-28 bg-gradient-to-r from-indigo-600 to-violet-700" />

                <div className="px-6 pb-6">
                    <div className="-mt-12 flex items-end gap-4">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 border-4 border-white dark:border-slate-900 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                            {initials || "P"}
                        </div>

                        <div className="pb-2 min-w-0">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                {patient.name}
                            </h2>
                            <p className="text-sm text-slate-500">
                                Patient
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 text-xs text-slate-400">
                        Patient ID: {patient._id}
                    </div>
                </div>
            </div>

            {/* Personal Information */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">

                <h3 className="font-bold text-slate-800 dark:text-white mb-5">
                    Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ProfileField
                        label="Full Name"
                        value={patient.name}
                        icon="👤"
                    />

                    <ProfileField
                        label="Email Address"
                        value={patient.email}
                        icon="📧"
                    />

                    <ProfileField
                        label="Phone Number"
                        value={patient.phone}
                        icon="📞"
                    />

                    <ProfileField
                        label="Date of Birth"
                        value={dob}
                        icon="🎂"
                    />

                    <ProfileField
                        label="Age"
                        value={`${patient.age} years`}
                        icon="📅"
                    />

                    <ProfileField
                        label="Gender"
                        value={patient.gender}
                        icon="⚧️"
                    />

                    <ProfileField
                        label="Blood Group"
                        value={patient.bloodGroup}
                        icon="🩸"
                    />

                    <ProfileField
                        label="Emergency Contact"
                        value={patient.emergencyContact}
                        icon="🚨"
                    />

                    <div className="md:col-span-2">
                        <ProfileField
                            label="Address"
                            value={patient.address}
                            icon="📍"
                        />
                    </div>
                </div>
            </div>

            {/* Medical Information */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">

                <h3 className="font-bold text-slate-800 dark:text-white mb-4">
                    Medical Information
                </h3>

                <ProfileField
                    label="Medical History"
                    value={patient.medicalHistory}
                    icon="🏥"
                />

            </div>

            {/* Treatment History */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">

                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">
                            Treatment History
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Your previous consultations and prescriptions
                        </p>
                    </div>

                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                        {history.length} Records
                    </span>
                </div>

                {historyLoading ? (
                    <p className="text-center py-8 text-slate-500">
                        Loading treatment history...
                    </p>
                ) : history.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="text-4xl mb-3">🏥</div>
                        <p className="font-semibold text-slate-700 dark:text-white">
                            No treatment history found
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                            Your consultation records will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {history.map((item) => (
                            <div
                                key={item._id}
                                className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4"
                            >
                                {/* Consultation Header */}
                                <div className="flex flex-wrap justify-between gap-3">
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-white">
                                            {item.diagnosis}
                                        </p>

                                        <p className="text-sm text-slate-500 mt-1">
                                            {item.doctorId?.userId?.name || "Doctor"}
                                            {" · "}
                                            {item.departmentId?.name || "Department"}
                                        </p>
                                    </div>

                                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">
                                        {item.consultationDate
                                            ? new Date(item.consultationDate).toLocaleDateString("en-IN")
                                            : "Date unavailable"}
                                    </span>
                                </div>

                                {/* Symptoms */}
                                {item.symptoms && (
                                    <div>
                                        <p className="text-xs font-bold uppercase text-slate-400 mb-1">
                                            Symptoms
                                        </p>
                                        <p className="text-sm text-slate-700 dark:text-slate-300">
                                            {item.symptoms}
                                        </p>
                                    </div>
                                )}

                                {/* Treatment */}
                                {item.treatment && (
                                    <div>
                                        <p className="text-xs font-bold uppercase text-slate-400 mb-1">
                                            Treatment
                                        </p>
                                        <p className="text-sm text-slate-700 dark:text-slate-300">
                                            {item.treatment}
                                        </p>
                                    </div>
                                )}

                                {/* Medicines */}
                                {item.medicines?.length > 0 && (
                                    <div>
                                        <p className="text-xs font-bold uppercase text-slate-400 mb-2">
                                            Prescribed Medicines
                                        </p>

                                        <div className="space-y-2">
                                            {item.medicines.map((medicine) => (
                                                <div
                                                    key={medicine._id}
                                                    className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3"
                                                >
                                                    <p className="font-semibold text-sm text-slate-800 dark:text-white">
                                                        💊 {medicine.name}
                                                    </p>

                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {medicine.dosage || "Dosage not specified"}
                                                        {" · "}
                                                        {medicine.frequency || "Frequency not specified"}
                                                        {" · "}
                                                        {medicine.duration || "Duration not specified"}
                                                    </p>

                                                    {medicine.instructions && (
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            Instructions: {medicine.instructions}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Doctor Notes */}
                                {item.notes && (
                                    <div>
                                        <p className="text-xs font-bold uppercase text-slate-400 mb-1">
                                            Doctor's Notes
                                        </p>
                                        <p className="text-sm text-slate-700 dark:text-slate-300">
                                            {item.notes}
                                        </p>
                                    </div>
                                )}

                                {/* Follow-up */}
                                {(item.followUpRecommendation || item.followUpDate) && (
                                    <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-lg p-3">
                                        <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                                            Follow-up
                                        </p>

                                        {item.followUpRecommendation && (
                                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                                {item.followUpRecommendation}
                                            </p>
                                        )}

                                        {item.followUpDate && (
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                Date: {new Date(item.followUpDate).toLocaleDateString("en-IN")}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>


        </div>
    );
}
