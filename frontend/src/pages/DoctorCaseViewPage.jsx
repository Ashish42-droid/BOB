import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stethoscope, Video, FileText, CheckCircle2, AlertOctagon, XCircle, ArrowLeft, Send, HeartPulse, User, Bot, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import AIDoctorVisualSeparation from '../components/AIDoctorVisualSeparation';
import VideoConsultationModal from '../components/VideoConsultationModal';

export default function DoctorCaseViewPage() {
  const { id: visitId } = useParams();
  const navigate = useNavigate();

  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);

  // Doctor Action States
  const [doctorNotes, setDoctorNotes] = useState('');
  const [decision, setDecision] = useState('APPROVED');
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Digital Prescription form
  const [rxMeds, setRxMeds] = useState([
    { name: 'Paracetamol', strength: '500 mg', frequency: 'Twice daily after food', duration: '3 days' },
    { name: 'Amoxicillin', strength: '500 mg', frequency: 'Three times daily', duration: '5 days' }
  ]);

  useEffect(() => {
    fetchCase();
  }, [visitId]);

  const fetchCase = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/doctor/cases/${visitId}`);
      setVisit(res.data);
    } catch (err) {
      // Fallback mock case for demo
      setVisit({
        id: visitId,
        chief_complaint: 'Tez bukhar 3 din se aur khansi',
        symptoms: 'High fever 101.2°F, dry cough, body aches',
        symptom_duration: '3 days',
        medical_history: 'No chronic illness',
        status: 'WAITING_DOCTOR',
        patients: {
          id: 'pt000000-0000-0000-0000-000000000001',
          patient_code: 'PAT-2026-001',
          name: 'Ramesh Kumar',
          age: 42,
          gender: 'Male',
          village: 'Rampur',
          preferred_language: 'Hindi'
        },
        vitals: [{ temperature: 101.2, pulse: 88, spo2: 97, blood_pressure_systolic: 120, blood_pressure_diastolic: 80 }],
        ai_assessments: [{
          risk_level: 'MODERATE',
          summary: 'Patient Ramesh Kumar (42M) presents with 3-day acute febrile illness (Temp 101.2°F, SpO2 97%). Verified prescription document confirms recent paracetamol intake.',
          warnings: ['High body temperature recorded: 101.2°F.'],
          recommendations: [{ title: 'Acute Febrile Illness Protocol (MoHFW)', source: 'Govt of India STG 2024', guidance: 'Symptomatic fever management + oral hydration.' }]
        }]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeDecision = async (selectedDecision) => {
    setSubmitting(true);
    try {
      await api.post(`/doctor/cases/${visitId}/review`, {
        ai_assessment_id: visit?.ai_assessments?.[0]?.id,
        decision: selectedDecision || decision,
        doctor_notes: doctorNotes || 'Clinical decision approved based on tele-consultation evaluation.',
        prescription_data: { medications: rxMeds }
      });

      alert(`Doctor Decision '${selectedDecision || decision}' finalized! Digital prescription saved to record.`);
      navigate('/doctor/queue');
    } catch (err) {
      alert('Failed to record decision: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleHospitalReferral = async () => {
    const hospital = prompt('Enter Referral Destination Hospital:', 'District Government Hospital, Varanasi');
    if (!hospital) return;

    setSubmitting(true);
    try {
      await api.post(`/doctor/cases/${visitId}/refer`, {
        hospital_name: hospital,
        urgency_level: 'EMERGENCY',
        referral_reason: doctorNotes || 'Emergency escalation required.'
      });

      alert(`Emergency Referral dispatched to ${hospital}!`);
      navigate('/doctor/queue');
    } catch (err) {
      alert('Referral failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (!visit) return <div className="p-8 text-center text-slate-400">Loading Case Details...</div>;

  const patient = visit.patients || { name: 'Ramesh Kumar', patient_code: 'PAT-2026-001', age: 42, gender: 'Male', village: 'Rampur' };
  const vitals = visit.vitals?.[0] || { temperature: 101.2, blood_pressure_systolic: 120, blood_pressure_diastolic: 80, pulse: 88, spo2: 97 };
  const aiAssessment = visit.ai_assessments?.[0];

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/doctor/queue')}
            className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              Case Review: {patient.name}
              <span className="font-mono text-xs bg-slate-900 text-cyan-400 px-2 py-0.5 rounded border border-slate-800">
                {patient.patient_code}
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              {patient.age} Yrs | {patient.gender} | Village: {patient.village} | Language: {patient.preferred_language || 'Hindi'}
            </p>
          </div>
        </div>

        {/* Video Call Trigger */}
        <button
          onClick={() => setShowVideoCall(true)}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2"
        >
          <Video className="w-4 h-4" /> START VIDEO CONSULTATION
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT 2 COLUMNS: PATIENT DATA & VITALS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Patient Vitals Summary */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <HeartPulse className="w-4 h-4" /> Recorded Vitals & Physical Signs
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">Temperature</span>
                <span className="font-bold text-white text-sm">{vitals.temperature ? `${vitals.temperature} °F` : 'Not recorded'}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">Blood Pressure</span>
                <span className="font-bold text-white text-sm">{vitals.blood_pressure_systolic ? `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic}` : 'Not recorded'}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">Pulse</span>
                <span className="font-bold text-white text-sm">{vitals.pulse ? `${vitals.pulse} bpm` : 'Not recorded'}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">SpO2 Oxygen</span>
                <span className="font-bold text-emerald-400 text-sm">{vitals.spo2 ? `${vitals.spo2} %` : 'Not recorded'}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">Resp Rate</span>
                <span className="font-bold text-white text-sm">{vitals.respiratory_rate ? `${vitals.respiratory_rate} /min` : 'Not recorded'}</span>
              </div>
            </div>
          </div>

          {/* AI VS DOCTOR VISUAL SEPARATION */}
          <AIDoctorVisualSeparation
            aiAssessment={aiAssessment}
            doctorReview={visit.doctor_reviews?.[0]}
            prescription={visit.prescriptions?.[0]}
          />
        </div>

        {/* RIGHT COLUMN: DOCTOR DECISION PANEL */}
        <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-emerald-300 flex items-center gap-2">
              <Stethoscope className="w-5 h-5" /> Doctor Action Panel
            </h3>

            {/* Decision Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Clinical Decision</label>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDecision('APPROVED')}
                  className={`py-2 rounded-xl border transition-colors ${decision === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                >
                  ✓ APPROVE AI
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('MODIFIED')}
                  className={`py-2 rounded-xl border transition-colors ${decision === 'MODIFIED' ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                >
                  ✏️ MODIFY AI
                </button>
              </div>
            </div>

            {/* Doctor Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Doctor Clinical Notes</label>
              <textarea
                rows={3}
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Enter diagnosis, advice, and rationale..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Prescription Generator */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-emerald-300">Issue Digital Prescription</label>
              </div>
              <div className="space-y-2">
                {rxMeds.map((med, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <div className="font-semibold text-white">{med.name} ({med.strength})</div>
                    <div className="text-slate-400 text-[11px]">{med.frequency} - {med.duration}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-4 border-t border-slate-800">
            <button
              onClick={() => handleFinalizeDecision(decision)}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> {submitting ? 'Finalizing...' : 'FINALIZING & ISSUE PRESCRIPTION'}
            </button>

            <button
              onClick={handleHospitalReferral}
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-2"
            >
              <AlertOctagon className="w-4 h-4 text-rose-400" /> DISPATCH EMERGENCY HOSPITAL REFERRAL
            </button>
          </div>
        </div>

      </div>

      {/* Video Call Modal */}
      {showVideoCall && (
        <VideoConsultationModal
          roomId={`room_${visitId.replace(/-/g, '_')}`}
          patientName={patient.name}
          onClose={() => setShowVideoCall(false)}
        />
      )}

    </div>
  );
}
