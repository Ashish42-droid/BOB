import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Search, Activity, Clock, ShieldAlert, CheckCircle, ArrowRight, User } from 'lucide-react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';

export default function AssistantDashboard() {
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({
    today_patients: 1,
    waiting_for_doctor: 1,
    high_risk_cases: 0,
    completed_consultations: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, aRes] = await Promise.all([
        api.get('/patients'),
        api.get('/admin/analytics').catch(() => ({ data: {} }))
      ]);
      setPatients(pRes.data || []);
      if (aRes.data) setStats(prev => ({ ...prev, ...aRes.data }));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(p =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.patient_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.village || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            Clinic Assistant Workspace
            <span className="text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">Active Shift</span>
          </h1>
          <p className="text-xs text-slate-400">Rampur Village Primary Health Centre</p>
        </div>

        <Link
          to="/assistant/patients/new"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all"
        >
          <UserPlus className="w-4 h-4" /> + REGISTER NEW PATIENT
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">Today's Patients</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">{patients.length || 1}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <User className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">Waiting for Doctor</p>
            <h3 className="text-2xl font-extrabold text-amber-400 mt-1">{stats.waiting_for_doctor || 1}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">High-Risk Cases</p>
            <h3 className="text-2xl font-extrabold text-rose-400 mt-1">{stats.high_risk_cases || 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">Completed Consults</p>
            <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.completed_consultations || 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Patient Queue */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-white">Village Patient Directory & Active Queue</h2>
          
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search ID, Name, Village..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:border-cyan-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Patient ID</th>
                <th className="px-4 py-3">Name & Demographics</th>
                <th className="px-4 py-3">Village</th>
                <th className="px-4 py-3">Language</th>
                <th className="px-4 py-3">ABHA Number</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredPatients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-cyan-400 font-bold">{p.patient_code}</td>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-white">{p.name}</div>
                    <div className="text-[11px] text-slate-400">{p.age} Yrs | {p.gender}</div>
                  </td>
                  <td className="px-4 py-3.5">{p.village}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">{p.preferred_language || 'Hindi'}</span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-400">{p.abha_number || 'Not Linked'}</td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => navigate(`/assistant/assessment/${p.id}`)}
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 font-semibold text-xs transition-all inline-flex items-center gap-1.5"
                    >
                      <Activity className="w-3.5 h-3.5" /> Start Visit & Assess
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
