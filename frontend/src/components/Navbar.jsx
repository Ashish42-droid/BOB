import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, LogOut, ShieldCheck, Stethoscope, UserCog } from 'lucide-react';

export default function Navbar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'DOCTOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Stethoscope className="w-3.5 h-3.5" /> Doctor
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <UserCog className="w-3.5 h-3.5" /> Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <ShieldCheck className="w-3.5 h-3.5" /> Clinic Assistant
          </span>
        );
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 lg:px-8 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Header */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-base text-slate-900 flex items-center gap-2">
              Virtual Village Clinic
              <span className="text-[10px] uppercase font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">AI Platform</span>
            </div>
            <p className="text-xs text-slate-500">Rural Tele-Healthcare System</p>
          </div>
        </Link>

        {/* Controls & User Navigation */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-900">{user.name}</span>
                <span className="text-[11px] text-slate-500">{user.email}</span>
              </div>

              {getRoleBadge(user.role)}

              {user.role === 'CLINIC_ASSISTANT' && (
                <Link to="/assistant/dashboard" className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors">
                  Dashboard
                </Link>
              )}
              {user.role === 'DOCTOR' && (
                <Link to="/doctor/queue" className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors">
                  Doctor Queue
                </Link>
              )}
              {user.role === 'ADMIN' && (
                <Link to="/admin/dashboard" className="text-xs font-medium px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors">
                  Admin Panel
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 border border-slate-200 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
            >
              Sign In
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
}
