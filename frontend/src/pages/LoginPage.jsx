import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Stethoscope, UserCog, ArrowRight, Lock } from 'lucide-react';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || 'CLINIC_ASSISTANT';

  const [activeRole, setActiveRole] = useState(initialRole);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (activeRole === 'CLINIC_ASSISTANT') setEmail('assistant@clinic.org');
    if (activeRole === 'DOCTOR') setEmail('doctor@clinic.org');
    if (activeRole === 'ADMIN') setEmail('admin@clinic.org');
  }, [activeRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userProfile = await loginUser(email, activeRole);
      if (userProfile.role === 'DOCTOR') {
        navigate('/doctor/queue');
      } else if (userProfile.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/assistant/dashboard');
      }
    } catch (err) {
      alert('Login failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">Role-Based Access Login</h2>
          <p className="text-xs text-slate-400">Select your authorized role to access the Virtual Village Clinic platform.</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveRole('CLINIC_ASSISTANT')}
            className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${activeRole === 'CLINIC_ASSISTANT' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <ShieldCheck className="w-4 h-4" /> Assistant
          </button>
          <button
            type="button"
            onClick={() => setActiveRole('DOCTOR')}
            className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${activeRole === 'DOCTOR' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Stethoscope className="w-4 h-4" /> Doctor
          </button>
          <button
            type="button"
            onClick={() => setActiveRole('ADMIN')}
            className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${activeRole === 'ADMIN' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <UserCog className="w-4 h-4" /> Admin
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Quick Demo Account:</span>
            <span className="font-mono text-cyan-300">{email}</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-sm hover:brightness-110 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'LOG IN TO DASHBOARD'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-[11px] text-slate-500">
          Patient Login: <strong className="text-slate-400">NOT REQUIRED</strong> (Clinic Assistants manage patient records).
        </div>
      </div>
    </div>
  );
}
