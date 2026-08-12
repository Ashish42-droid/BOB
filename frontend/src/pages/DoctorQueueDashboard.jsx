import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Clock, ShieldAlert, ArrowRight, Video, User, AlertOctagon, PhoneCall, PhoneIncoming, PhoneOff, Bot, Camera, FileText, CheckCircle2, Eye } from 'lucide-react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import VideoConsultationModal from '../components/VideoConsultationModal';

export default function DoctorQueueDashboard() {
  const [queue, setQueue] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Active Selected Doctor
  const [selectedDoctor, setSelectedDoctor] = useState('Dr. Rajesh Sharma (AIIMS New Delhi)');

  // Doctor Video Modal State
  const [activeVideoRoom, setActiveVideoRoom] = useState(null);

  // Incoming Ringing Call State (Starts inactive)
  const [incomingCall, setIncomingCall] = useState({
    active: false,
    patient_name: '',
    patient_code: '',
    village: '',
    risk_level: 'MODERATE',
    reason: '',
    room_id: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchQueueAndConsultations();
    // Realtime polling interval every 3 seconds for active doctor queue updates
    const interval = setInterval(fetchQueueAndConsultations, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueueAndConsultations = async () => {
    try {
      const [qRes, cRes] = await Promise.all([
        api.get('/doctor/queue').catch(() => ({ data: [] })),
        api.get('/consultations').catch(() => ({ data: [] }))
      ]);

      const consultList = (cRes.data || []).filter(c => c.status !== 'DECLINED');
      const queueList = qRes.data || [];

      setQueue(queueList);
      setConsultations(consultList);

      // Check if there is an active real-time pushed call for doctor (that was NOT declined)
      const latestActiveCall = consultList.find(c => c.status === 'CALL_RINGTONE_ACTIVE' && c.status !== 'DECLINED');
      if (latestActiveCall) {
        setIncomingCall({
          active: true,
          patient_name: latestActiveCall.patient_name || 'Patient',
          patient_code: latestActiveCall.patient_code || 'PAT-2026-001',
          village: latestActiveCall.village || 'Rampur Village',
          risk_level: latestActiveCall.risk_level || 'HIGH',
          reason: latestActiveCall.reason || 'High Priority AI Case Assessment Review',
          room_id: latestActiveCall.room_id || `room_${latestActiveCall.id}`,
          ai_summary: latestActiveCall.ai_summary,
          vision_observation: latestActiveCall.vision_observation,
          verified_ocr_data: latestActiveCall.verified_ocr_data,
          consultation_id: latestActiveCall.id
        });
      }

    } catch (err) {
      console.error('Failed to load doctor queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorJoinCall = async (consultId, roomId, patientName) => {
    try {
      if (consultId) {
        await api.post(`/consultations/${consultId}/join`).catch(() => {});
      }
      setActiveVideoRoom({
        room_id: roomId || `room_${Date.now()}`,
        user_name: selectedDoctor,
        user_id: `doc_${Date.now()}`,
        patient_name: patientName || 'Patient'
      });
      setIncomingCall(prev => ({ ...prev, active: false }));
    } catch (err) {
      setActiveVideoRoom({
        room_id: roomId || `room_demo_101`,
        user_name: selectedDoctor,
        user_id: `doc_${Date.now()}`,
        patient_name: patientName || 'Patient'
      });
      setIncomingCall(prev => ({ ...prev, active: false }));
    }
  };

  const handleDeclineCall = async (consultId) => {
    try {
      if (consultId) {
        await api.post(`/consultations/${consultId}/decline`).catch(() => {});
      }
      setIncomingCall({ active: false });
    } catch (err) {
      setIncomingCall({ active: false });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      
      {/* Top Minimalist Doctor Desk Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-emerald-400" /> Remote Doctor Teleconsultation Desk
          </h1>
          <p className="text-xs text-slate-400">Minimalist Clinical Decision Support System & Realtime Doctor Portal</p>
        </div>

        {/* Doctor Specialist Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Active Doctor:</span>
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-cyan-500 outline-none font-bold cursor-pointer"
          >
            <option value="Dr. Rajesh Sharma (AIIMS New Delhi)">Dr. Rajesh Sharma (AIIMS New Delhi) - General Physician</option>
            <option value="Dr. Ananya Sen (JIPMER Puducherry)">Dr. Ananya Sen (JIPMER Puducherry) - Pediatrician</option>
            <option value="Dr. Vikramaditya Rao (PGIMER Chandigarh)">Dr. Vikramaditya Rao (PGIMER Chandigarh) - Cardiologist</option>
            <option value="Dr. Meera Nambiar (KEM Hospital Mumbai)">Dr. Meera Nambiar (KEM Hospital Mumbai) - Gynecologist</option>
            <option value="Dr. Suresh Patel (BHU Varanasi)">Dr. Suresh Patel (BHU Varanasi) - Pulmonologist</option>
          </select>
        </div>
      </div>

      {/* REALTIME INCOMING VIDEO CALL BANNER */}
      {incomingCall && incomingCall.active && (
        <div className="glass-panel p-6 rounded-3xl border-2 border-emerald-500/60 bg-emerald-950/20 glow-emerald space-y-6">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center animate-bounce shrink-0">
                <PhoneIncoming className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    📞 REALTIME EMERGENCY CONSULTATION REQUEST
                  </span>
                  <RiskBadge level={incomingCall.risk_level} />
                </div>
                <h2 className="text-lg font-extrabold text-white mt-1">
                  {incomingCall.patient_name} <span className="text-xs font-mono text-cyan-400">({incomingCall.patient_code})</span>
                </h2>
                <p className="text-xs text-slate-300">{incomingCall.reason} — <strong className="text-emerald-300">{incomingCall.village}</strong></p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => handleDoctorJoinCall(incomingCall.consultation_id, incomingCall.room_id, incomingCall.patient_name)}
                className="flex-1 md:flex-none px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all"
              >
                <PhoneCall className="w-4 h-4 animate-pulse" /> 🟢 ACCEPT & JOIN VIDEO CALL
              </button>
              <button
                onClick={() => handleDeclineCall(incomingCall.consultation_id)}
                className="px-4 py-3 rounded-2xl bg-slate-900 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 border border-slate-800 font-bold text-xs flex items-center gap-1.5"
              >
                <PhoneOff className="w-4 h-4" /> DECLINE CALL
              </button>
            </div>
          </div>

          {/* REALTIME PUSHED CLINICAL PACKET WITH INJURY IMAGE & COMPUTER VISION ANALYSIS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-emerald-500/20">
            
            {/* 1. AI Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
              <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-cyan-400" /> AI LLM Assessment Summary
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-4">
                {incomingCall.ai_summary?.patient_summary || 'High fever with dry cough. Risk evaluated as MODERATE/HIGH. MoHFW Primary Care STG Protocol applied.'}
              </p>
            </div>

            {/* 2. Injury Photo & Detailed Computer Vision Analysis */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
              <div className="font-bold text-purple-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Eye className="w-4 h-4 text-purple-400" /> Computer Vision Wound Analysis</span>
              </div>
              
              {/* Actual Uploaded Wound Photo Thumbnail */}
              {incomingCall.vision_observation?.image_url && (
                <div className="rounded-xl overflow-hidden border border-purple-500/30">
                  <img src={incomingCall.vision_observation.image_url} alt="Uploaded Wound Photo" className="w-full h-28 object-cover" />
                </div>
              )}

              <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-3">
                {incomingCall.vision_observation?.cautious_summary || 'Computer Vision: Erythematous margin and mild swelling logged for doctor inspection.'}
              </p>
            </div>

            {/* 3. Prescription OCR */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" /> Scanned Document (OCR)
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-4">
                {incomingCall.verified_ocr_data?.medications ? (
                  incomingCall.verified_ocr_data.medications.map(m => `${m.name} (${m.frequency})`).join(', ')
                ) : 'Paper prescription uploaded and verified by Clinic Assistant.'}
              </p>
            </div>

          </div>

        </div>
      )}

      {/* SCHEDULED TELECONSULTATIONS SECTION */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-emerald-400" /> Scheduled Video Calls & Consultations
            </h2>
            <p className="text-xs text-slate-400">Doctor receives calls at scheduled time from village sub-centre assistant & patient.</p>
          </div>
        </div>

        {consultations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-2xl">
            No scheduled video calls pending.
          </div>
        ) : (
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
                  <div className="text-[11px] text-emerald-300 mt-1">Doctor: {c.doctor_name || selectedDoctor}</div>
                  <div className="text-[11px] text-amber-300 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" /> Scheduled: {new Date(c.scheduled_time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDoctorJoinCall(c.id, c.room_id, c.patient_name)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 border border-emerald-500/40 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    <PhoneCall className="w-4 h-4" /> ANSWER CALL
                  </button>
                  <button
                    onClick={() => handleDeclineCall(c.id)}
                    className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-rose-950 hover:text-rose-400 text-slate-400 border border-slate-800 font-bold text-xs"
                  >
                    DECLINE
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Minimalist Triage Queue Table / Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white">Patient Triage Queue (Retrieved from Supabase Database)</h2>

        {queue.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center text-slate-400 text-xs">
            No active cases waiting in queue. Add a patient from Assistant Portal to view here.
          </div>
        ) : (
          queue.map((item) => {
            const patient = item.patients || { name: 'Ramesh Kumar', patient_code: 'PAT-2026-001', age: 42, gender: 'male', village: 'Rampur' };
            const pName = patient.full_name || patient.name || 'Patient';
            const riskLevel = item.risk_level || item.ai_assessments?.[0]?.risk_level || 'MODERATE';
            const isEmergency = riskLevel === 'EMERGENCY' || riskLevel === 'RED' || riskLevel === 'HIGH';

            return (
              <div
                key={item.id}
                className={`glass-panel p-6 rounded-3xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${isEmergency ? 'border-rose-500/60 bg-rose-950/20' : 'border-slate-800 hover:border-slate-700'}`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs font-bold bg-slate-900 text-cyan-400 px-2.5 py-0.5 rounded border border-slate-800">
                      {patient.patient_code || 'PAT-2026-001'}
                    </span>
                    <h3 className="text-base font-bold text-white">{pName}</h3>
                    <RiskBadge level={riskLevel} />
                  </div>

                  <p className="text-xs text-slate-300">
                    <strong>Chief Complaint:</strong> {item.chief_complaint || item.symptoms || 'Acute Symptoms Review'}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span>Village: <strong className="text-slate-200">{patient.village || 'Rampur'}</strong></span>
                    <span>Status: <span className="text-emerald-400 font-semibold">{item.status || 'open'}</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <button
                    onClick={() => handleDoctorJoinCall(item.id, `room_${item.id}`, pName)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-500/30 font-bold text-xs flex items-center gap-1.5"
                  >
                    <Video className="w-4 h-4 text-purple-400" /> Start Video Call
                  </button>

                  <button
                    onClick={() => navigate(`/doctor/cases/${item.id}`)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 ${isEmergency ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'}`}
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
          userId={activeVideoRoom.user_id}
          patientName={activeVideoRoom.patient_name}
          onClose={() => setActiveVideoRoom(null)}
        />
      )}

    </div>
  );
}
