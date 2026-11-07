import { useEffect, useState } from "react";
import { useToast } from "../components/Toast";
import { apiRequest } from "../services/apiService";

export default function DoctorVerification() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadPending = async () => {
    try {
      const res = await apiRequest("/admin/pending-doctors");
      setDoctors(res.data);
    } catch (err) {
      toast("Failed to load pending doctors", "error");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (id) => {
    try {
      await apiRequest(`/admin/doctors/${id}/verify`, "PATCH");
      toast("Doctor verified successfully!", "success");
      loadPending();
    } catch (err) {
      toast(err.message || "Error verifying doctor", "error");
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  return (
    <div className="p-6 animate-fade-in max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Pending Doctor Approvals</h1>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : doctors.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-2xl text-center text-slate-500">
          No pending doctor verifications.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">Email</th>
                <th className="py-4 px-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {doctors.map(d => (
                <tr key={d._id} className="text-sm">
                  <td className="py-4 px-6 text-slate-800 dark:text-slate-200 font-semibold">{d.name}</td>
                  <td className="py-4 px-6 text-slate-500">{d.email}</td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => verify(d._id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl transition-all"
                    >
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
