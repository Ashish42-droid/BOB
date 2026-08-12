import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stethoscope, Video, FileText, CheckCircle2, AlertOctagon, ArrowLeft, HeartPulse, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';
import AIDoctorVisualSeparation from '../components/AIDoctorVisualSeparation';
import WebRTCVideoCallModal from '../components/WebRTCVideoCallModal';
import { supabase } from '../config/supabase';

export default function DoctorCaseViewPage() {
  const { id: visitId } = useParams();
  const navigate = useNavigate();

  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

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

    // Supabase Realtime Subscription for Uploads, AI Assessment, and Vitals Updates
    const channel = supabase
      .channel(`public:case_${visitId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_assessments', filter: `visit_id=eq.${visitId}` }, (payload) => {
        console.log('⚡ Realtime AI Assessment Payload:', payload);
        fetchCase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_images', filter: `visit_id=eq.${visitId}` }, (payload) => {
        console.log('⚡ Realtime Patient Image Payload:', payload);
        fetchCase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_documents', filter: `visit_id=eq.${visitId}` }, (payload) => {
        console.log('⚡ Realtime Patient Document Payload:', payload);
        fetchCase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visit_vitals', filter: `visit_id=eq.${visitId}` }, (payload) => {
        console.log('⚡ Realtime Vitals Payload:', payload);
        fetchCase();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [visitId]);

  const fetchCase = async () => {
    try {
      const res = await api.get(`/doctor/cases/${visitId}`);
      setVisit(res.data);
      setFetchError(null);
    } catch (err) {
      console.error('Error loading doctor case details from database:', err);
      setFetchError(err.response?.data?.error || err.message || 'Database fetch error');
    } finally {
      setLoading(false);
    }
  };

  const handleMedChange = (index, field, val) => {
    const updated = [...rxMeds];
    updated[index][field] = val;
    setRxMeds(updated);
  };

  const addMed = () => {
    setRxMeds([...rxMeds, { name: '', strength: '', frequency: '', duration: '' }]);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post(`/doctor/cases/${visitId}/review`, {
        decision,
        doctor_notes: doctorNotes,
        prescription: {
          prescription_data: {
            medications: rxMeds.filter(m => m.name.trim() !== '')
          }
        }
      });

      alert('Doctor Review & Signed Digital Prescription saved to database!');
      navigate('/doctor/queue');
    } catch (err) {
      console.error('Review submission error:', err);
      alert('Failed to submit review: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !fetchError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" /> Querying Supabase Database Patient Case File...
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 font-semibold max-w-lg mx-auto flex items-center gap-2 justify-center">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>Error loading case file: {fetchError}</span>
        </div>
        <button
          onClick={() => { setLoading(true); fetchCase(); }}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Sync with Database
        </button>
      </div>
    );
  }

  const patient = visit?.patient || {};
  const vitals = visit?.vitals || {};
  const aiAssessment = visit?.ai_assessment || {};
  const doctorReview = visit?.doctor_review || null;
  const prescription = visit?.prescription || null;
  const documents = visit?.patient_documents || [];
  const images = visit?.patient_images || [];

  const pName = patient.full_name || patient.name || 'Patient Record';
  const pCode = patient.patient_code || 'PAT-RECORD';

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      
      {/* Top Bar Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/doctor/queue')} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-600" /> Patient Medical Case File Review
            </h1>
            <p className="text-xs text-slate-500">Visit ID: <code className="font-mono text-blue-600 font-bold">{visitId}</code> — Database Live Synced</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowVideoCall(true)}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Video className="w-4 h-4" /> START WEBRTC VIDEO CONSULTATION
          </button>
        </div>
      </div>

      {/* Patient Demographics & Vitals Banner */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
        <div>
          <span className="text-slate-500 block text-[11px]">Patient Name & Code:</span>
          <div className="font-bold text-slate-900 text-sm mt-0.5">{pName}</div>
          <div className="font-mono text-blue-600 font-semibold">{pCode}</div>
        </div>

        <div>
          <span className="text-slate-500 block text-[11px]">Age / Gender / Village:</span>
          <div className="font-bold text-slate-900 mt-0.5">{patient.age_years || patient.age || 45} Yrs / {patient.gender || 'Female'}</div>
          <div className="text-slate-600 font-medium">{patient.village || 'Rampur PHC'}</div>
        </div>

        <div>
          <span className="text-slate-500 block text-[11px]">Recorded Vitals:</span>
          <div className="font-bold text-slate-900 mt-0.5">BP: {vitals.blood_pressure_systolic || 120}/{vitals.blood_pressure_diastolic || 80} mmHg</div>
          <div className="text-slate-600">Temp: {vitals.temperature || '101.2'}°F | SpO2: {vitals.spo2 || '97'}%</div>
        </div>

        <div>
          <span className="text-slate-500 block text-[11px]">Chief Complaint:</span>
          <div className="font-bold text-slate-900 mt-0.5">{visit.chief_complaint || 'Acute Symptoms Review'}</div>
        </div>
      </div>

      {/* 2-Column Split: Left = AI Assistance & Artifacts (Full Computer Vision), Right = Doctor Decision */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: AI Assistance & Artifacts (Full Vision Analysis Output) */}
        <div className="lg:col-span-7">
          <AIDoctorVisualSeparation
            aiAssessment={aiAssessment}
            doctorReview={doctorReview}
            prescription={prescription}
            documents={documents}
            images={images}
          />
        </div>

        {/* Right Column: Doctor Review & Digital Prescription Form */}
        <div className="lg:col-span-5 bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-5 h-fit sticky top-6">
          <div className="pb-3 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-emerald-600" /> Registered Doctor Decision Form
            </h3>
            <p className="text-xs text-slate-500">Issue signed digital prescription and clinical notes.</p>
          </div>

          <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
            
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Clinical Decision:</label>
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-blue-500 outline-none font-semibold cursor-pointer"
              >
                <option value="APPROVED">APPROVED — Issue Prescription & Treatment Plan</option>
                <option value="REFERRAL_REQUIRED">REFERRAL REQUIRED — Direct to District Civil Hospital</option>
                <option value="REJECTED">REJECTED — Insufficient Data / Re-assess at PHC</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Doctor Clinical Observations & Notes:</label>
              <textarea
                rows={4}
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:border-blue-500 outline-none leading-relaxed"
                placeholder="Enter doctor clinical diagnosis, advice, and instructions for ANM..."
                required
              />
            </div>

            {/* Digital Prescription Form */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Signed Digital Prescription:</span>
                <button type="button" onClick={addMed} className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold">
                  + Add Medication
                </button>
              </div>

              {rxMeds.map((med, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Medicine Name (e.g. Paracetamol)"
                      value={med.name}
                      onChange={(e) => handleMedChange(idx, 'name', e.target.value)}
                      className="bg-white border border-slate-300 rounded p-1.5 text-slate-900 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Dosage / Strength (500 mg)"
                      value={med.strength}
                      onChange={(e) => handleMedChange(idx, 'strength', e.target.value)}
                      className="bg-white border border-slate-300 rounded p-1.5 text-slate-900 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Frequency (Twice daily)"
                      value={med.frequency}
                      onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                      className="bg-white border border-slate-300 rounded p-1.5 text-slate-900 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Duration (3 days)"
                      value={med.duration}
                      onChange={(e) => handleMedChange(idx, 'duration', e.target.value)}
                      className="bg-white border border-slate-300 rounded p-1.5 text-slate-900 outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> {submitting ? 'Submitting Review...' : 'SUBMIT DOCTOR REVIEW & PRESCRIPTION'}
            </button>

          </form>
        </div>

      </div>

      {/* Pure WebRTC Video Call Modal */}
      {showVideoCall && (
        <WebRTCVideoCallModal
          roomId={`room_${visitId.replace(/-/g, '_')}`}
          userName="Dr. Rajesh Sharma (AIIMS New Delhi)"
          userId={`doc_${Date.now()}`}
          role="DOCTOR"
          peerName={pName}
          onClose={() => setShowVideoCall(false)}
        />
      )}

    </div>
  );
}
