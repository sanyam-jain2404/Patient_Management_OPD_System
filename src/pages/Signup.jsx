import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../components/Toast";
import { register } from "../services/apiService";

export default function Signup() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "patient",
    specialization: "",
    qualification: "",
    experience: 0
  });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSignup = async e => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast("Password must be at least 8 characters.", "warning");
      return;
    }
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,

        ...(form.role === "doctor" && {
          specialization: form.specialization,
          qualification: form.qualification,
          experience: Number(form.experience)
        })
      });
      toast("Account created successfully! Please log in.", "success");
      navigate("/login");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left hero */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-violet-900 via-slate-900 to-indigo-900 p-12 relative overflow-hidden">
        <div className="absolute top-20 right-10 w-72 h-72 bg-violet-600/30 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-indigo-600/30 rounded-full blur-3xl animate-blob" style={{ animationDelay: "2s" }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-2xl">🏥</div>
            <div>
              <p className="text-white font-bold text-xl">OPD Portal</p>
              <p className="text-violet-300 text-sm">Patient Management System</p>
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-white leading-tight">
            Join Our<br />Healthcare<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-cyan-300">
              Platform.
            </span>
          </h1>
          <p className="text-slate-400 mt-4 text-sm leading-relaxed max-w-xs">
            Create your account to start managing OPD patients, scheduling appointments, and generating reports.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-3">
          {["Real-time patient tracking", "Smart discharge management", "Prescription & vitals recording", "Daily OPD analytics"].map(f => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-500/30 border border-indigo-500/50 flex items-center justify-center text-xs text-indigo-300">✓</div>
              <span className="text-slate-300 text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="text-2xl">🏥</span>
            <span className="text-white font-bold text-lg">OPD Portal</span>
          </div>

          <h2 className="text-3xl font-extrabold text-white mb-1">Create account</h2>
          <p className="text-slate-400 text-sm mb-8">Fill in the details to get started</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Full Name</label>
              <input
                name="name" required placeholder="Dr. Priya Sharma"
                onChange={handleChange}
                className="w-full bg-slate-800/60 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full bg-slate-800/60 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor (Pending Verification)</option>
              </select>
            </div>

            {form.role === "doctor" && (
              <div className="space-y-4">

                {/* Specialization */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Specialization
                  </label>

                  <select
                    name="specialization"
                    value={form.specialization}
                    onChange={handleChange}
                    required
                    className="w-full bg-slate-800/60 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">Select Specialization</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="ENT">ENT</option>
                    <option value="Gynecology">Gynecology</option>
                  </select>
                </div>

                {/* Qualification */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Qualification
                  </label>

                  <input
                    name="qualification"
                    value={form.qualification}
                    onChange={handleChange}
                    required
                    placeholder="MBBS, MD"
                    className="w-full bg-slate-800/60 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Experience (Years)
                  </label>

                  <input
                    name="experience"
                    type="number"
                    min="0"
                    value={form.experience}
                    onChange={handleChange}
                    required
                    placeholder="5"
                    className="w-full bg-slate-800/60 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

              </div>
            )}



            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Email</label>
              <input
                name="email" type="email" required placeholder="you@hospital.com"
                onChange={handleChange}
                className="w-full bg-slate-800/60 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  name="password" type={showPwd ? "text" : "password"} required
                  placeholder="Min. 8 characters"
                  onChange={handleChange}
                  className="w-full bg-slate-800/60 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-lg transition-colors">
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Creating account...
                </span>
              ) : "Create Account →"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}