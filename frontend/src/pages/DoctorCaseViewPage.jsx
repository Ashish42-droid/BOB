import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stethoscope, Video, FileText, CheckCircle2, AlertOctagon, ArrowLeft, HeartPulse } from 'lucide-react';
import api from '../services/api';
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
          patient_summary: 'Patient Ramesh Kumar (42M) presents with 3-day acute febrile illness (Temp 101.2°F, SpO2 97%). Verified prescription document confirms recent paracetamol intake.',
          warnings: ['High body temperature recorded: 101.2°F.'],
          protocol_matches: [{ title: 'Acute Febrile Illness Protocol (MoHFW)', source: 'Govt of India STG 2024', guidance: 'Symptomatic fever management + oral hydration.' }]
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

  if (!visit) return <div className="p-8 text-center text-slate-500">Loading Case Details...</div>;

  const patient = visit.patients || { name: 'Ramesh Kumar', patient_code: 'PAT-2026-001', age: 42, gender: 'Male', village: 'Rampur' };
  const vitals = visit.visit_vitals?.[0] || visit.vitals?.[0] || { temperature: 101.2, blood_pressure_systolic: 120, blood_pressure_diastolic: 80, pulse: 88, spo2: 97 };
  const aiAssessment = visit.ai_assessments?.[0] || visit.ai_summary;
  const documents = visit.patient_documents || visit.medical_documents || [];
  const images = visit.patient_images || [];

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/doctor/queue')}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Case Review: {patient.full_name || patient.name}
              <span className="font-mono text-xs bg-slate-100 text-blue-600 px-2 py-0.5 rounded border border-slate-200">
                {patient.patient_code}
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              {patient.age_years || patient.age} Yrs | {patient.gender} | Village: {patient.village} | Language: {patient.preferred_language || 'Hindi'}
            </p>
          </div>
        </div>

        {/* Video Call Trigger */}
        <button
          onClick={() => setShowVideoCall(true)}
          className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition-colors"
        >
          <Video className="w-4 h-4" /> START VIDEO CONSULTATION
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT 2 COLUMNS: PATIENT DATA & VITALS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Patient Vitals Summary */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-blue-600" /> Recorded Vitals & Physical Signs
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">Temperature</span>
                <span className="font-bold text-slate-900 text-sm">
                  {vitals.temperature || vitals.temperature_fahrenheit ? `${vitals.temperature || vitals.temperature_fahrenheit} °F` : (vitals.temperature_celsius ? `${vitals.temperature_celsius} °C` : 'Not recorded')}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">Blood Pressure</span>
                <span className="font-bold text-slate-900 text-sm">
                  {vitals.blood_pressure_systolic || vitals.systolic_bp ? `${vitals.blood_pressure_systolic || vitals.systolic_bp}/${vitals.blood_pressure_diastolic || vitals.diastolic_bp}` : 'Not recorded'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">Pulse</span>
                <span className="font-bold text-slate-900 text-sm">{vitals.pulse || vitals.pulse_bpm ? `${vitals.pulse || vitals.pulse_bpm} bpm` : 'Not recorded'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">SpO2 Oxygen</span>
                <span className="font-bold text-emerald-600 text-sm">{vitals.spo2 || vitals.oxygen_saturation ? `${vitals.spo2 || vitals.oxygen_saturation} %` : 'Not recorded'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">Resp Rate</span>
                <span className="font-bold text-slate-900 text-sm">{vitals.respiratory_rate ? `${vitals.respiratory_rate} /min` : 'Not recorded'}</span>
              </div>
            </div>
          </div>

          {/* AI VS DOCTOR VISUAL SEPARATION WITH ALL 3 ARTIFACTS */}
          <AIDoctorVisualSeparation
            aiAssessment={aiAssessment}
            doctorReview={visit.doctor_reviews?.[0]}
            prescription={visit.prescriptions?.[0]}
            documents={documents}
            images={images}
          />
        </div>

        {/* RIGHT COLUMN: DOCTOR DECISION PANEL */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-600" /> Doctor Action Panel
            </h3>

            {/* Decision Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Decision</label>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDecision('APPROVED')}
                  className={`py-2 rounded-lg border transition-colors ${decision === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  ✓ APPROVE AI
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('MODIFIED')}
                  className={`py-2 rounded-lg border transition-colors ${decision === 'MODIFIED' ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  ✏️ MODIFY AI
                </button>
              </div>
            </div>

            {/* Doctor Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor Clinical Notes</label>
              <textarea
                rows={3}
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Enter diagnosis, advice, and rationale..."
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Prescription Generator */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-800">Issue Digital Prescription</label>
              </div>
              <div className="space-y-2">
                {rxMeds.map((med, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="font-semibold text-slate-900">{med.name} ({med.strength})</div>
                    <div className="text-slate-500 text-[11px]">{med.frequency} - {med.duration}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-4 border-t border-slate-200">
            <button
              onClick={() => handleFinalizeDecision(decision)}
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> {submitting ? 'Finalizing...' : 'FINALIZING & ISSUE PRESCRIPTION'}
            </button>

            <button
              onClick={handleHospitalReferral}
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <AlertOctagon className="w-4 h-4 text-red-600" /> DISPATCH EMERGENCY HOSPITAL REFERRAL
            </button>
          </div>
        </div>

      </div>

      {/* Video Call Modal */}
      {showVideoCall && (
        <VideoConsultationModal
          roomId={`room_${visitId.replace(/-/g, '_')}`}
          patientName={patient.full_name || patient.name}
          userName="Dr. Remote Specialist"
          userId={`doc_${Date.now()}`}
          onClose={() => setShowVideoCall(false)}
        />
      )}

    </div>
  );
}
