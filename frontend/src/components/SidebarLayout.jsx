import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Users,
  Stethoscope,
  ShieldCheck,
  UserCog,
  LogOut,
  Home,
  Bell,
  Search,
  ChevronRight,
  Plus
} from 'lucide-react';

export default function SidebarLayout({ children }) {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'DOCTOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Stethoscope className="w-3 h-3" /> Doctor Specialist
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <UserCog className="w-3 h-3" /> System Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <ShieldCheck className="w-3 h-3" /> Clinic Assistant
          </span>
        );
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
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      
      {/* LEFT FIXED SIDEBAR */}
      <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between fixed inset-y-0 left-0 z-40 shadow-sm">
        
        <div className="p-5 space-y-6">
          {/* Brand Logo Header */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                Virtual Clinic
                <span className="text-[9px] uppercase font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">SaaS</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Rural Tele-Healthcare</p>
            </div>
          </Link>

          {/* Navigation Menu */}
          <nav className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Main Navigation</div>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-600" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar User Profile & Controls */}
        <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50/50">
          {user ? (
            <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[130px]">{user.name}</div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[130px]">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-md bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 transition-colors"
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
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              Sign In to Platform
            </Link>
          )}
        </div>

      </aside>

      {/* SPACIOUS DASHBOARD CONTENT AREA */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        
        {/* Top Navbar Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="text-sm font-bold text-slate-900 tracking-tight">
              Modern Healthcare SaaS Platform
            </div>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Systems Active (142 Tele-Clinics Online)
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Quick patient search..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            
            <button className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-1.5 right-1.5"></span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>

        {/* Minimalist Footer */}
        <footer className="border-t border-slate-200 px-8 py-4 text-xs text-slate-500 flex items-center justify-between bg-white">
          <div>Virtual Village Clinic Platform &copy; 2026 — AI prepares the case. The doctor makes the decision.</div>
          <div className="font-mono text-[11px] text-slate-400">MoHFW STG Protocol Engine Active</div>
        </footer>

      </div>

    </div>
  );
}
