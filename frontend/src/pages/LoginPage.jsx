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
      <div className="bg-white w-full max-w-md p-8 rounded-lg border border-slate-200 shadow-sm space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Role-Based Platform Login</h2>
          <p className="text-xs text-slate-500">Select your authorized role to access the Virtual Village Clinic platform.</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveRole('CLINIC_ASSISTANT')}
            className={`py-2 rounded-md flex flex-col items-center gap-1 transition-colors ${activeRole === 'CLINIC_ASSISTANT' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <ShieldCheck className="w-4 h-4" /> Assistant
          </button>
          <button
            type="button"
            onClick={() => setActiveRole('DOCTOR')}
            className={`py-2 rounded-md flex flex-col items-center gap-1 transition-colors ${activeRole === 'DOCTOR' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Stethoscope className="w-4 h-4" /> Doctor
          </button>
          <button
            type="button"
            onClick={() => setActiveRole('ADMIN')}
            className={`py-2 rounded-md flex flex-col items-center gap-1 transition-colors ${activeRole === 'ADMIN' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <UserCog className="w-4 h-4" /> Admin
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>Quick Demo Account:</span>
            <span className="font-mono text-blue-600 font-semibold">{email}</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'LOG IN TO DASHBOARD'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Patient Login: <strong className="text-slate-700">NOT REQUIRED</strong> (Clinic Assistants manage patient records).
        </div>
      </div>
    </div>
  );
}
