import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Clock, ShieldAlert, ArrowRight, Video, User, AlertOctagon, PhoneCall } from 'lucide-react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import VideoConsultationModal from '../components/VideoConsultationModal';

export default function DoctorQueueDashboard() {
  const [queue, setQueue] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Doctor Video Modal State
  const [activeVideoRoom, setActiveVideoRoom] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchQueueAndConsultations();
  }, []);

  const fetchQueueAndConsultations = async () => {
    setLoading(true);
    try {
      const [qRes, cRes] = await Promise.all([
        api.get('/doctor/queue'),
        api.get('/consultations').catch(() => ({ data: [] }))
      ]);
      setQueue(qRes.data || []);
      setConsultations(cRes.data || []);
    } catch (err) {
      console.error('Failed to load doctor queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorJoinCall = async (consultId, roomId) => {
    try {
      const res = await api.post(`/consultations/${consultId}/join`);
      setActiveVideoRoom({
        room_id: res.data.room_id || roomId,
        user_name: res.data.user_name || 'Dr. Rajesh Sharma (AIIMS)'
      });
    } catch (err) {
      setActiveVideoRoom({
        room_id: roomId || `room_demo_101`,
        user_name: 'Dr. Rajesh Sharma (AIIMS)'
      });
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
          <p className="text-xs text-slate-400">Client-Server Teleconsultation Desk (Sorted by Emergency & Risk Level)</p>
        </div>
      </div>

      {/* SCHEDULED TELECONSULTATIONS SECTION (MODERATE, HIGH & REGULAR VISIT PATIENTS) */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-emerald-400 animate-pulse" /> Scheduled Video Calls & Incoming Patient Consultations
            </h2>
            <p className="text-xs text-slate-400">Doctor receives calls at scheduled time from village sub-centre assistant & patient.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {consultations.map((c) => (
            <div key={c.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <RiskBadge level={c.risk_level || 'MODERATE'} />
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded">
                    {c.status || 'SCHEDULED'}
                  </span>
                </div>

                <div className="font-bold text-sm text-white">{c.patient_name}</div>
                <div className="text-xs text-slate-400">Code: <strong className="text-cyan-400">{c.patient_code}</strong></div>
                <div className="text-[11px] text-slate-300 mt-1 font-medium">{c.reason || 'Follow-up Consultation'}</div>
                <div className="text-[11px] text-amber-300 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" /> Scheduled: {new Date(c.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <button
                onClick={() => handleDoctorJoinCall(c.id, c.room_id)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 hover:brightness-110 flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4 animate-bounce" /> 📞 ANSWER / JOIN DOCTOR VIDEO CONSULTATION
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Triage Queue Table / Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white">Patient Triage Queue</h2>

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
                    onClick={() => handleDoctorJoinCall(item.id, `room_${item.id}`)}
                    className="px-4 py-2.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center gap-1.5"
                  >
                    <Video className="w-4 h-4 text-purple-400" /> Start Video Call
                  </button>

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

      {/* ZEGO CLOUD DOCTOR VIDEO CONSULTATION MODAL */}
      {activeVideoRoom && (
        <VideoConsultationModal
          roomId={activeVideoRoom.room_id}
          userName={activeVideoRoom.user_name}
          onClose={() => setActiveVideoRoom(null)}
        />
      )}

    </div>
  );
}
