import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, LogOut, ShieldCheck, Stethoscope, UserCog, Sun, Moon } from 'lucide-react';

export default function Navbar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'DOCTOR':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><Stethoscope className="w-3 h-3" /> Doctor</span>;
      case 'ADMIN':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30"><UserCog className="w-3 h-3" /> Admin</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"><ShieldCheck className="w-3 h-3" /> Clinic Assistant</span>;
    }
  };

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Header */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="font-extrabold text-lg tracking-tight flex items-center gap-2">
              Virtual Village Clinic
              <span className="text-[10px] uppercase font-bold bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/30">AI-Powered</span>
            </div>
            <p className="text-xs text-slate-400">Rural Tele-Healthcare Platform</p>
          </div>
        </Link>

        {/* Controls & User Navigation */}
        <div className="flex items-center gap-3">
          
          {/* Light / Dark Mode Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-amber-400 border border-slate-800 transition-all flex items-center gap-1.5 text-xs font-bold"
            title="Toggle Light / Dark Mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold">{user.name}</span>
                <span className="text-xs text-slate-400">{user.email}</span>
              </div>

              {getRoleBadge(user.role)}

              {user.role === 'CLINIC_ASSISTANT' && (
                <Link to="/assistant/dashboard" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-colors">
                  Dashboard
                </Link>
              )}
              {user.role === 'DOCTOR' && (
                <Link to="/doctor/queue" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 hover:bg-emerald-900 text-emerald-300 transition-colors">
                  Doctor Queue
                </Link>
              )}
              {user.role === 'ADMIN' && (
                <Link to="/admin/dashboard" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-950/80 border border-purple-500/30 hover:bg-purple-900 text-purple-300 transition-colors">
                  Admin Panel
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-slate-900 hover:bg-rose-950/50 hover:text-rose-400 text-slate-400 border border-slate-800 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 hover:brightness-110 shadow-lg shadow-cyan-500/20 transition-all"
            >
              Role Login
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
}
