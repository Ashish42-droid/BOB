import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Users,
  Video,
  Stethoscope,
  ShieldCheck,
  UserCog,
  LogOut,
  Sun,
  Moon,
  Home,
  FileText,
  Bell,
  Search,
  ChevronRight,
  Plus
} from 'lucide-react';

export default function SidebarLayout({ children }) {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'DOCTOR':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"><Stethoscope className="w-3 h-3" /> Doctor Specialist</span>;
      case 'ADMIN':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"><UserCog className="w-3 h-3" /> System Admin</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"><ShieldCheck className="w-3 h-3" /> Clinic Assistant</span>;
    }
  };

  const navItems = [
    { label: 'Home / Overview', path: '/', icon: <Home className="w-4 h-4" /> },
    ...(user?.role === 'CLINIC_ASSISTANT' ? [
      { label: 'Assistant Workspace', path: '/assistant/dashboard', icon: <Users className="w-4 h-4" /> },
      { label: 'Register New Patient', path: '/assistant/patients/new', icon: <Plus className="w-4 h-4" /> }
    ] : []),
    ...(user?.role === 'DOCTOR' ? [
      { label: 'Doctor Teleconsult Desk', path: '/doctor/queue', icon: <Stethoscope className="w-4 h-4" /> }
    ] : []),
    ...(user?.role === 'ADMIN' ? [
      { label: 'India Admin Analytics', path: '/admin/dashboard', icon: <Activity className="w-4 h-4" /> }
    ] : [])
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* LEFT FIXED SIDEBAR */}
      <aside className="w-64 shrink-0 bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between fixed inset-y-0 left-0 z-40 shadow-sm">
        
        <div className="p-5 space-y-6">
          {/* Brand Logo Header */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                Virtual Clinic
                <span className="text-[9px] uppercase font-bold bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">SaaS</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Rural Tele-Healthcare</p>
            </div>
          </Link>

          {/* Navigation Menu */}
          <nav className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Main Navigation</div>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${isActive ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-800/60 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'}`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar User Profile & Controls */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
          
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-all"
          >
            <div className="flex items-center gap-2">
              {theme === 'light' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-blue-400" />}
              <span>{theme === 'light' ? 'Light Theme' : 'Dark Theme'}</span>
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">{theme}</span>
          </button>

          {user ? (
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[130px]">{user.name}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>{getRoleBadge(user.role)}</div>
            </div>
          ) : (
            <Link
              to="/login"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all"
            >
              Sign In to Platform
            </Link>
          )}
        </div>

      </aside>

      {/* SPACIOUS DASHBOARD CONTENT AREA */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        
        {/* Top Navbar Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
              Modern Healthcare SaaS Platform
            </div>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Systems Active (142 Tele-Clinics Online)
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Quick patient search..."
                className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            
            <button className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-1.5 right-1.5"></span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Minimalist Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 px-8 py-4 text-xs text-slate-400 flex items-center justify-between bg-white dark:bg-[#111827]">
          <div>Virtual Village Clinic Platform &copy; 2026 — AI prepares the case. The doctor makes the decision.</div>
          <div className="font-mono text-[11px] text-slate-400">MoHFW STG Protocol Engine Active</div>
        </footer>

      </div>

    </div>
  );
}
