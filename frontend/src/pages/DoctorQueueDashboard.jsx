import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Clock, ShieldAlert, ArrowRight, Video, User, AlertOctagon } from 'lucide-react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';

export default function DoctorQueueDashboard() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.get('/doctor/queue');
      setQueue(res.data || []);
    } catch (err) {
      console.error('Failed to load doctor queue:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-emerald-400" /> Remote Doctor Consultation Queue
          </h1>
          <p className="text-xs text-slate-400">Prioritized Case Queue (Sorted by Emergency & Risk Level)</p>
        </div>
      </div>

      {/* Queue Table / Grid */}
      <div className="space-y-4">
        {queue.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center text-slate-400 text-xs">
            No active cases waiting in queue.
          </div>
        ) : (
          queue.map((item) => {
            const patient = item.patients || { name: 'Ramesh Kumar', patient_code: 'PAT-2026-001', age: 42, gender: 'Male', village: 'Rampur' };
            const riskLevel = item.ai_assessments?.[0]?.risk_level || 'MODERATE';
            const isEmergency = riskLevel === 'EMERGENCY' || riskLevel === 'RED';

            return (
              <div
                key={item.id}
                className={`glass-panel p-6 rounded-3xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${isEmergency ? 'border-rose-500/60 bg-rose-950/20 glow-rose' : 'border-slate-800 hover:border-emerald-500/40'}`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs font-bold bg-slate-900 text-cyan-400 px-2.5 py-0.5 rounded border border-slate-800">
                      {patient.patient_code}
                    </span>
                    <h3 className="text-lg font-extrabold text-white">{patient.name}</h3>
                    <RiskBadge level={riskLevel} />
                  </div>

                  <p className="text-xs text-slate-300">
                    <strong>Chief Complaint:</strong> {item.chief_complaint || item.symptoms || 'Acute Febrile Illness & Cough'}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span>Village: <strong className="text-slate-200">{patient.village}</strong></span>
                    <span>Wait Time: <strong className="text-amber-400">06 mins</strong></span>
                    <span>Status: <span className="text-emerald-400 font-semibold">{item.status}</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <button
                    onClick={() => navigate(`/doctor/cases/${item.id}`)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 ${isEmergency ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-bounce' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'}`}
                  >
                    {isEmergency ? 'URGENT REVIEW CASE NOW' : 'VIEW CASE FILE'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
