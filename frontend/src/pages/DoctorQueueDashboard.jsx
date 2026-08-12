import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Clock, ShieldAlert, ArrowRight, Video, User, AlertOctagon, PhoneCall, PhoneIncoming, PhoneOff, Bot, Camera, FileText, CheckCircle2, Eye, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import VideoConsultationModal from '../components/VideoConsultationModal';
import { supabase } from '../config/supabase';

export default function DoctorQueueDashboard() {
  const [queue, setQueue] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  
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

    // Supabase Realtime Subscription for Live Video Call Status Changes
    const channel = supabase
      .channel('public:consultations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations' }, (payload) => {
        console.log('⚡ Supabase Realtime Consultation Payload Received:', payload);
        fetchQueueAndConsultations();
      })
      .subscribe();

    // Realtime polling fallback interval every 4 seconds
    const interval = setInterval(fetchQueueAndConsultations, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const fetchQueueAndConsultations = async () => {
    try {
      const [qRes, cRes] = await Promise.all([
        api.get('/doctor/queue'),
        api.get('/consultations').catch(() => ({ data: [] }))
      ]);

      const consultList = (cRes.data || []).filter(c => c.status !== 'DECLINED');
      const queueList = qRes.data || [];

      setQueue(queueList);
      setConsultations(consultList);
      setFetchError(null);

      // Check if there is an active call ringtone status pushed for doctor
      const latestActiveCall = consultList.find(c => c.status === 'CALL_RINGTONE_ACTIVE' && c.status !== 'DECLINED');
      if (latestActiveCall) {
        setIncomingCall({
          active: true,
          patient_name: latestActiveCall.patient_name || 'Patient',
          patient_code: latestActiveCall.patient_code || 'PAT-RECORD',
          village: latestActiveCall.village || 'Primary Health Centre',
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
      console.error('Failed to load doctor queue from database:', err);
      setFetchError(err.response?.data?.error || err.message || 'Database connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorJoinCall = async (consultId, roomId, patientName) => {
    try {
      if (consultId) {
        const res = await api.post(`/consultations/${consultId}/join`).catch(() => {});
        if (res?.data?.status === 'COMPLETED') {
          alert('Call has already been completed.');
          return;
        }
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
        room_id: roomId || `room_${Date.now()}`,
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
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      
      {/* Top Minimalist Doctor Desk Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-blue-600" /> Remote Doctor Teleconsultation Desk
          </h1>
          <p className="text-xs text-slate-500">Live Database Connected — Realtime Doctor Portal</p>
        </div>

        {/* Doctor Specialist Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-medium">Active Doctor:</span>
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 outline-none font-semibold cursor-pointer"
          >
            <option value="Dr. Rajesh Sharma (AIIMS New Delhi)">Dr. Rajesh Sharma (AIIMS New Delhi) - General Physician</option>
            <option value="Dr. Ananya Sen (JIPMER Puducherry)">Dr. Ananya Sen (JIPMER Puducherry) - Pediatrician</option>
            <option value="Dr. Vikramaditya Rao (PGIMER Chandigarh)">Dr. Vikramaditya Rao (PGIMER Chandigarh) - Cardiologist</option>
            <option value="Dr. Meera Nambiar (KEM Hospital Mumbai)">Dr. Meera Nambiar (KEM Hospital Mumbai) - Gynecologist</option>
            <option value="Dr. Suresh Patel (BHU Varanasi)">Dr. Suresh Patel (BHU Varanasi) - Pulmonologist</option>
          </select>
        </div>
      </div>

      {/* ERROR STATE */}
      {fetchError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span><strong>Database Fetch Error:</strong> {fetchError}</span>
          </div>
          <button
            onClick={() => { setLoading(true); fetchQueueAndConsultations(); }}
            className="px-3 py-1.5 rounded bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Sync
          </button>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && !fetchError && (
        <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" /> Querying Supabase Database Queue...
        </div>
      )}

      {/* REALTIME INCOMING VIDEO CALL BANNER */}
      {!loading && incomingCall && incomingCall.active && (
        <div className="bg-emerald-50 p-6 rounded-lg border border-emerald-300 shadow-sm space-y-6">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <PhoneIncoming className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                    📞 REALTIME EMERGENCY CONSULTATION REQUEST
                  </span>
                  <RiskBadge level={incomingCall.risk_level} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  {incomingCall.patient_name} <span className="text-xs font-mono text-blue-600">({incomingCall.patient_code})</span>
                </h2>
                <p className="text-xs text-slate-600">{incomingCall.reason} — <strong className="text-slate-900">{incomingCall.village}</strong></p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => handleDoctorJoinCall(incomingCall.consultation_id, incomingCall.room_id, incomingCall.patient_name)}
                className="flex-1 md:flex-none px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-colors"
              >
                <PhoneCall className="w-4 h-4" /> ACCEPT & JOIN VIDEO CALL
              </button>
              <button
                onClick={() => handleDeclineCall(incomingCall.consultation_id)}
                className="px-4 py-2.5 rounded-lg bg-white hover:bg-red-50 hover:text-red-600 text-slate-700 border border-slate-300 font-semibold text-xs flex items-center gap-1.5"
              >
                <PhoneOff className="w-4 h-4" /> DECLINE CALL
              </button>
            </div>
          </div>

          {/* REALTIME PUSHED CLINICAL PACKET WITH INJURY IMAGE & COMPLETE COMPUTER VISION ANALYSIS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-emerald-200">
            
            {/* 1. AI Summary */}
            <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1.5 shadow-sm">
              <div className="font-semibold text-blue-700 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-blue-600" /> AI LLM Assessment Summary
              </div>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                {incomingCall.ai_summary?.patient_summary || 'Symptoms recorded for doctor review.'}
              </p>
            </div>

            {/* 2. Injury Photo & Complete Computer Vision Analysis Breakdown */}
            <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-xs space-y-2 shadow-sm">
              <div className="font-semibold text-purple-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Eye className="w-4 h-4 text-purple-600" /> Computer Vision Wound Analysis</span>
              </div>
              
              {/* Actual Uploaded Wound Photo Thumbnail */}
              {incomingCall.vision_observation?.image_url && (
                <div className="rounded-lg overflow-hidden border border-slate-200">
                  <img src={incomingCall.vision_observation.image_url} alt="Uploaded Wound Photo" className="w-full h-32 object-contain bg-slate-50" />
                </div>
              )}

              {/* Complete Breakdown */}
              <div className="space-y-1 text-[11px] text-slate-700 pt-1">
                {incomingCall.vision_observation?.computer_vision_analysis?.tissue_margin && (
                  <div><strong>Erythema Margin:</strong> {incomingCall.vision_observation.computer_vision_analysis.tissue_margin}</div>
                )}
                {incomingCall.vision_observation?.computer_vision_analysis?.surface_features && (
                  <div><strong>Surface & Swelling:</strong> {incomingCall.vision_observation.computer_vision_analysis.surface_features}</div>
                )}
                {incomingCall.vision_observation?.computer_vision_analysis?.exudate_observation && (
                  <div><strong>Exudate / Discharge:</strong> {incomingCall.vision_observation.computer_vision_analysis.exudate_observation}</div>
                )}
                <div className="pt-1 border-t border-slate-200 text-slate-900 font-medium leading-relaxed">
                  {incomingCall.vision_observation?.cautious_summary || 'Computer Vision: Image surface observation attached.'}
                </div>
              </div>
            </div>

            {/* 3. Prescription OCR */}
            <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1.5 shadow-sm">
              <div className="font-semibold text-emerald-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" /> Scanned Document (OCR)
              </div>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                {incomingCall.verified_ocr_data?.medications ? (
                  incomingCall.verified_ocr_data.medications.map(m => `${m.name} (${m.frequency})`).join(', ')
                ) : 'Paper prescription uploaded and verified by Clinic Assistant.'}
              </p>
            </div>

          </div>

        </div>
      )}

      {/* SCHEDULED TELECONSULTATIONS SECTION */}
      {!loading && (
        <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Video className="w-5 h-5 text-purple-600" /> Scheduled Video Calls & Consultations
              </h2>
              <p className="text-xs text-slate-500">Doctor receives calls at scheduled time from village sub-centre assistant & patient.</p>
            </div>
          </div>

          {consultations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-lg">
              No scheduled video calls pending in database.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {consultations.map((c) => (
                <div key={c.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <RiskBadge level={c.risk_level || 'MODERATE'} />
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${c.status === 'ONGOING' ? 'bg-emerald-100 text-emerald-800 animate-pulse' : 'bg-slate-200 text-slate-700'}`}>
                        {c.status === 'ONGOING' ? '🟢 IN PROGRESS' : (c.status || 'SCHEDULED')}
                      </span>
                    </div>

                    <div className="font-bold text-sm text-slate-900">{c.patient_name}</div>
                    <div className="text-xs text-slate-500">Code: <strong className="text-blue-600">{c.patient_code}</strong></div>
                    <div className="text-xs text-slate-700 mt-1 font-medium">{c.reason || 'Follow-up Consultation'}</div>
                    <div className="text-xs text-slate-600 mt-1">Doctor: {c.doctor_name || selectedDoctor}</div>
                    <div className="text-xs text-amber-700 flex items-center gap-1 mt-1 font-medium">
                      <Clock className="w-3.5 h-3.5" /> Scheduled: {new Date(c.scheduled_time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDoctorJoinCall(c.id, c.room_id, c.patient_name)}
                      className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <PhoneCall className="w-3.5 h-3.5" /> JOIN VIDEO CALL
                    </button>
                    <button
                      onClick={() => handleDeclineCall(c.id)}
                      className="px-3 py-2 rounded-lg bg-white hover:bg-red-50 hover:text-red-600 text-slate-600 border border-slate-300 font-semibold text-xs transition-colors"
                    >
                      DECLINE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Patient Triage Queue Table / Grid */}
      {!loading && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">Patient Triage Queue (Retrieved from Supabase Database)</h2>

          {queue.length === 0 ? (
            <div className="bg-white p-12 rounded-lg border border-slate-200 shadow-sm text-center text-slate-500 text-xs">
              No active patient cases in database queue. Add a patient visit from Assistant Portal to populate this list.
            </div>
          ) : (
            queue.map((item) => {
              const patient = item.patients || {};
              const pName = patient.full_name || patient.name || 'Patient Record';
              const pCode = patient.patient_code || 'PAT-RECORD';
              const villageName = patient.village || 'Primary Health Centre';
              const riskLevel = item.risk_level || item.ai_assessments?.[0]?.risk_level || 'MODERATE';
              const isEmergency = riskLevel === 'EMERGENCY' || riskLevel === 'RED' || riskLevel === 'HIGH';

              return (
                <div
                  key={item.id}
                  className={`bg-white p-6 rounded-lg border shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${isEmergency ? 'border-red-300 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-xs font-bold bg-slate-100 text-blue-600 px-2.5 py-0.5 rounded border border-slate-200">
                        {pCode}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{pName}</h3>
                      <RiskBadge level={riskLevel} />
                    </div>

                    <p className="text-xs text-slate-700">
                      <strong>Chief Complaint:</strong> {item.chief_complaint || item.symptoms || 'Acute Symptoms Review'}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span>Village: <strong className="text-slate-800">{villageName}</strong></span>
                      <span>Status: <span className="text-emerald-700 font-semibold">{item.status || 'open'}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <button
                      onClick={() => handleDoctorJoinCall(item.id, `room_${item.id}`, pName)}
                      className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 border border-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Video className="w-3.5 h-3.5 text-purple-600" /> Start Video Call
                    </button>

                    <button
                      onClick={() => navigate(`/doctor/cases/${item.id}`)}
                      className={`px-4 py-2 rounded-lg font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5 ${isEmergency ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                      {isEmergency ? 'URGENT REVIEW CASE' : 'VIEW CASE FILE'} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

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
