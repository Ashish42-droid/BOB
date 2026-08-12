import React, { useState, useEffect } from 'react';
import { UserCog, BookOpen, ShieldCheck, Database, Plus, Search, Activity, FileText, Globe2, Stethoscope, BarChart3, PieChart, Building, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  
  // New User Form
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'DOCTOR', phone: '' });
  // New Protocol Form
  const [newProtocol, setNewProtocol] = useState({ name: '', category: 'General Medicine', risk_level: 'LOW', content: '' });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [uRes, pRes, aRes, statRes] = await Promise.all([
        api.get('/admin/users').catch(() => ({ data: [] })),
        api.get('/admin/protocols').catch(() => ({ data: [] })),
        api.get('/admin/audit').catch(() => ({ data: [] })),
        api.get('/admin/analytics').catch(() => ({ data: {} }))
      ]);

      setUsers(uRes.data || []);
      setProtocols(pRes.data || []);
      setAuditLogs(aRes.data || []);
      setAnalytics(statRes.data || {});
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', newUser);
      alert('User created successfully!');
      setNewUser({ name: '', email: '', role: 'DOCTOR', phone: '' });
      fetchAdminData();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAddProtocol = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/protocols', newProtocol);
      alert('Approved Protocol added & ingested into Qdrant Vector DB with metadata approved = true!');
      setNewProtocol({ name: '', category: 'General Medicine', risk_level: 'LOW', content: '' });
      fetchAdminData();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const doctorsList = users.filter(u => u.role === 'DOCTOR');

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <UserCog className="w-6 h-6 text-purple-400" /> Platform Admin Dashboard
          </h1>
          <p className="text-xs text-slate-400">National Rural Healthcare Telemedicine Network & India-Level Analytics</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'analytics', label: 'India-Level Analytics', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'doctors', label: 'Registered Doctors (5 Panel)', icon: <Stethoscope className="w-4 h-4" /> },
          { id: 'protocols', label: 'Knowledge Base & Qdrant RAG', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'audit', label: 'System Compliance Audit Logs', icon: <Database className="w-4 h-4" /> }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === t.id ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: INDIA-LEVEL ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          
          {/* Top Key Performance Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold block">Connected Tele-Clinics</span>
              <h3 className="text-2xl font-extrabold text-cyan-400 mt-1">142</h3>
              <span className="text-[11px] text-slate-500 mt-1 block">Across 12 Indian States</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold block">Total Patients Served</span>
              <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">4,820</h3>
              <span className="text-[11px] text-slate-500 mt-1 block">Rural Citizens Treated</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold block">Completed Consultations</span>
              <h3 className="text-2xl font-extrabold text-purple-400 mt-1">3,410</h3>
              <span className="text-[11px] text-slate-500 mt-1 block">Signed Prescriptions Issued</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold block">Avg Doctor Response Time</span>
              <h3 className="text-2xl font-extrabold text-amber-400 mt-1">4.2 Mins</h3>
              <span className="text-[11px] text-slate-500 mt-1 block">Queue Turnaround</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Risk Distribution Breakdown */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-cyan-400" /> AI Patient Risk Triage Segregation
              </h3>
              <div className="space-y-3">
                {[
                  { level: 'LOW (GREEN)', percentage: 65, color: 'bg-emerald-500', desc: 'Protocol-Eligible / Approved First-Aid Guidance' },
                  { level: 'MODERATE (YELLOW)', percentage: 22, color: 'bg-amber-500', desc: 'Requires Non-Urgent Doctor Review' },
                  { level: 'HIGH (ORANGE)', percentage: 10, color: 'bg-orange-500', desc: 'Priority Doctor Consultation Queue' },
                  { level: 'EMERGENCY (RED)', percentage: 3, color: 'bg-rose-600', desc: 'Immediate Red Alert & Hospital Referral' }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                      <span>{item.level}</span>
                      <span>{item.percentage}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${item.percentage}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* State-Wise Tele-Clinic Coverage */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-400" /> State-Wise Tele-Health Network Coverage
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2">State</th>
                      <th className="px-3 py-2">Clinics</th>
                      <th className="px-3 py-2">Patients</th>
                      <th className="px-3 py-2">Emergency Referrals</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {[
                      { state: 'Uttar Pradesh', clinics: 34, patients: 1240, referrals: 12 },
                      { state: 'Bihar', clinics: 28, patients: 980, referrals: 9 },
                      { state: 'Madhya Pradesh', clinics: 22, patients: 750, referrals: 7 },
                      { state: 'West Bengal', clinics: 18, patients: 620, referrals: 5 },
                      { state: 'Rajasthan', clinics: 14, patients: 450, referrals: 4 },
                      { state: 'Odisha', clinics: 12, patients: 380, referrals: 3 }
                    ].map((st, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-semibold text-white">{st.state}</td>
                        <td className="px-3 py-2">{st.clinics}</td>
                        <td className="px-3 py-2 text-cyan-300">{st.patients}</td>
                        <td className="px-3 py-2 text-rose-400 font-bold">{st.referrals}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: REGISTERED DOCTORS & STAFF */}
      {activeTab === 'doctors' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Add Staff Form */}
            <form onSubmit={handleAddUser} className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" /> Provision Staff / Doctor Account
              </h3>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Full Name & Qualifications</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Verma (MBBS, MD)"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="DOCTOR">Doctor</option>
                  <option value="CLINIC_ASSISTANT">Clinic Assistant</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20"
              >
                CREATE USER ACCOUNT
              </button>
            </form>

            {/* 5 Qualified Doctor Roster */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-emerald-400" /> Qualified Remote Doctor Roster (5 Medical Specialists)
              </h3>
              <div className="space-y-3">
                {(analytics?.active_doctors || doctorsList).map((doc, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-emerald-300 flex items-center gap-2">
                        {doc.name}
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">Verified RMP</span>
                      </div>
                      <div className="text-xs text-slate-300 mt-1">{doc.qualifications || 'MBBS, MD - Senior Medical Officer'}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Email: {doc.email} | Contact: {doc.phone || '+91 9876500000'}</div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                      ACTIVE ON CALL
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 3: PROTOCOLS & QDRANT */}
      {activeTab === 'protocols' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleAddProtocol} className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" /> Ingest Approved Clinical Protocol
            </h3>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Protocol Title</label>
              <input
                type="text"
                value={newProtocol.name}
                onChange={(e) => setNewProtocol({ ...newProtocol, name: e.target.value })}
                placeholder="e.g. Minor Wound First Aid"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Category</label>
              <input
                type="text"
                value={newProtocol.category}
                onChange={(e) => setNewProtocol({ ...newProtocol, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Protocol Body Content</label>
              <textarea
                rows={4}
                value={newProtocol.content}
                onChange={(e) => setNewProtocol({ ...newProtocol, content: e.target.value })}
                placeholder="Detailed clinical steps..."
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20"
            >
              INGEST TO QDRANT RAG (approved = true)
            </button>
          </form>

          <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">Ingested MoHFW Clinical Protocols</h3>
            <div className="space-y-3">
              {protocols.map((p, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300">{p.name}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">APPROVED</span>
                  </div>
                  <p className="text-slate-300 leading-normal">{p.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white">Healthcare System Compliance Audit Trail</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2">Timestamp</th>
                  <th className="px-4 py-2">Actor Role</th>
                  <th className="px-4 py-2">Action</th>
                  <th className="px-4 py-2">Entity Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {auditLogs.map((log, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-purple-300">{log.actor_role}</td>
                    <td className="px-4 py-2 text-cyan-300 font-bold">{log.action}</td>
                    <td className="px-4 py-2 text-slate-300">{log.entity_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
