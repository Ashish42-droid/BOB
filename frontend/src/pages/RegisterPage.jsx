import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, ShieldCheck, Stethoscope, UserCog } from 'lucide-react';

const HOME_BY_ROLE = {
  DOCTOR: '/doctor/queue',
  ADMIN: '/admin/dashboard',
  CLINIC_ASSISTANT: '/assistant/dashboard'
};

const ROLES = [
  { value: 'CLINIC_ASSISTANT', label: 'Clinic Assistant', icon: ShieldCheck, note: 'Registers patients, records vitals, uploads documents' },
  { value: 'DOCTOR', label: 'Doctor', icon: Stethoscope, note: 'Reviews cases, prescribes, refers (medical registration required)' },
  { value: 'ADMIN', label: 'Administrator', icon: UserCog, note: 'Manages staff, protocols and audit logs' }
];

export default function RegisterPage() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    role: 'CLINIC_ASSISTANT',
    registration_number: '',
    specialization: '',
    qualification: ''
  });
  const [error, setError] = useState('');
  const { registerUser, loading } = useAuth();
  const navigate = useNavigate();

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    if (form.role === 'DOCTOR' && !form.registration_number.trim()) {
      setError('Doctors must enter their medical council registration number.');
      return;
    }

    try {
      const userProfile = await registerUser({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        role: form.role,
        registration_number: form.registration_number.trim() || undefined,
        specialization: form.specialization.trim() || undefined,
        qualification: form.qualification.trim() || undefined
      });
      navigate(HOME_BY_ROLE[userProfile.role] || '/assistant/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Account creation failed. Please try again.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg p-8 rounded-lg border border-slate-200 shadow-sm space-y-6">

        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto">
            <UserPlus className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Create Staff Account</h2>
          <p className="text-xs text-slate-500">Register as clinic staff. Your role controls which parts of the platform you can access.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Your role</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role: value }))}
                  className={`py-2.5 rounded-lg border flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
                    form.role === value
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">{ROLES.find((r) => r.value === form.role)?.note}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full name</label>
              <input value={form.full_name} onChange={set('full_name')} required placeholder="e.g. Sunita Devi"
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
              <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" placeholder="you@clinic.org"
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone (optional)</label>
              <input value={form.phone} onChange={set('phone')} placeholder="+91 ..."
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password (min 8 characters)</label>
              <input type="password" value={form.password} onChange={set('password')} required autoComplete="new-password"
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm password</label>
              <input type="password" value={form.confirm_password} onChange={set('confirm_password')} required autoComplete="new-password"
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:border-blue-500 outline-none" />
            </div>
          </div>

          {form.role === 'DOCTOR' && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Medical council registration number (required)</label>
                <input value={form.registration_number} onChange={set('registration_number')} placeholder="e.g. MCI-2015-12345"
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization</label>
                <input value={form.specialization} onChange={set('specialization')} placeholder="e.g. General Medicine"
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Qualification</label>
                <input value={form.qualification} onChange={set('qualification')} placeholder="e.g. MBBS, MD"
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:border-emerald-500 outline-none" />
              </div>
            </div>
          )}

          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm shadow-sm transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account & Sign In'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
