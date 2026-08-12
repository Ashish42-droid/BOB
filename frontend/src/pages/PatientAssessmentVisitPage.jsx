import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, Upload, FileText, Camera, Bot, ShieldCheck, ArrowRight, CheckCircle2, AlertTriangle, Activity, User, HeartPulse, RefreshCw, BookOpen, AlertOctagon, Download, Pill, PhoneCall, ArrowLeft, MicOff, Globe, Video, Send, ShieldAlert, Printer, Calendar } from 'lucide-react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import OCRVerificationModal from '../components/OCRVerificationModal';
import WebRTCVideoCallModal from '../components/WebRTCVideoCallModal';
import CallSchedulerModal from '../components/CallSchedulerModal';

export default function PatientAssessmentVisitPage() {
  const { id: patientId } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [visitId, setVisitId] = useState(null);
  
  // Tab states
  const [activeTab, setActiveTab] = useState('symptoms');
  
  // Symptoms & Voice Input
  const [symptomsText, setSymptomsText] = useState('Tez bukhar 3 din se aur khansi (High fever for 3 days and dry cough)');
  const [duration, setDuration] = useState('3 days');
  const [medicalHistory, setMedicalHistory] = useState('No chronic hypertension or diabetes history');
  const [recording, setRecording] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('Auto-Detecting...');

  // Selected Doctor for Video Call
  const [selectedDoctor, setSelectedDoctor] = useState('Dr. Rajesh Sharma (AIIMS New Delhi)');
  const [activeVideoRoom, setActiveVideoRoom] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [pushingToDoctor, setPushingToDoctor] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);

  // Real Microphone Recording Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  
  // Vitals with Strict Min/Max Clinical Range Verification
  const [vitals, setVitals] = useState({
    temperature: '101.2',
    blood_pressure_systolic: '120',
    blood_pressure_diastolic: '80',
    pulse: '88',
    spo2: '97',
    respiratory_rate: '18',
    weight: '62',
    height: '168'
  });
  const [vitalsError, setVitalsError] = useState(null);

  // Documents & OCR
  const [documentFile, setDocumentFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [verifiedOCRData, setVerifiedOCRData] = useState(null);

  // Image & Computer Vision Surface Observation
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [visionObservation, setVisionObservation] = useState(null);

  // AI Assessment Result
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiAssessment, setAiAssessment] = useState(null);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    fetchPatientAndVisit();
  }, [patientId]);

  const fetchPatientAndVisit = async () => {
    try {
      const pRes = await api.get(`/patients/${patientId}`);
      setPatient(pRes.data);

      const vRes = await api.post('/visits', {
        patient_id: patientId,
        chief_complaint: 'Routine Clinical Visit'
      });
      setVisitId(vRes.data.id);
    } catch (err) {
      console.error('Error fetching patient/visit:', err);
    }
  };

  const handleVitalsChange = (field, value) => {
    setVitals(prev => ({ ...prev, [field]: value }));
  };

  const validateVitalsBounds = () => {
    const temp = parseFloat(vitals.temperature);
    const sys = parseInt(vitals.blood_pressure_systolic);
    const dia = parseInt(vitals.blood_pressure_diastolic);
    const pulse = parseInt(vitals.pulse);
    const spo2 = parseInt(vitals.spo2);
    const resp = parseInt(vitals.respiratory_rate);

    if (temp < 95.0 || temp > 107.0) return 'Temperature out of clinical range (95.0°F - 107.0°F)';
    if (sys < 60 || sys > 250) return 'Systolic BP out of range (60 - 250 mmHg)';
    if (dia < 40 || dia > 150) return 'Diastolic BP out of range (40 - 150 mmHg)';
    if (pulse < 30 || pulse > 220) return 'Pulse out of range (30 - 220 bpm)';
    if (spo2 < 50 || spo2 > 100) return 'SpO2 out of range (50% - 100%)';
    if (resp < 8 || resp > 60) return 'Respiratory rate out of range (8 - 60 /min)';

    return null;
  };

  const handleStartVoiceRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'speech.webm');
        formData.append('language', 'Hindi');

        try {
          const res = await api.post('/voice/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          if (res.data.transcript) {
            setSymptomsText(res.data.transcript);
            setDetectedLanguage(res.data.detected_language || 'Hindi (Detected)');
          }
        } catch (err) {
          console.warn('Voice API fallback to SpeechRecognition:', err.message);
        }
      };

      mediaRecorderRef.current.start();
      setRecording(true);

      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'hi-IN';

        recognitionRef.current.onresult = (event) => {
          let current = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            current += event.results[i][0].transcript;
          }
          if (current) {
            setSymptomsText(current);
            setDetectedLanguage('Hindi / Regional');
          }
        };

        recognitionRef.current.start();
      }

    } catch (err) {
      alert('Microphone permission required for voice recording.');
    }
  };

  const handleStopVoiceRecording = () => {
    setRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('visit_id', visitId || '');
    formData.append('document_type', 'prescription');

    try {
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const docData = res.data;
      setUploadedDocuments(prev => [...prev, docData]);

      if (docData.ocr_data) {
        setCurrentDocument(docData);
        setShowOCRModal(true);
      }
    } catch (err) {
      console.error('Document upload error:', err);
      alert('Document upload failed: ' + formatApiError(err));
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('patient_id', patientId || '');
    formData.append('visit_id', visitId || '');

    try {
      const res = await api.post('/vision/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setVisionObservation(res.data);
    } catch (err) {
      console.error('Vision image upload error:', err);
      alert('Vision image upload failed: ' + formatApiError(err));
    } finally {
      setUploadingImage(false);
    }
  };

  const formatApiError = (err) => {
    if (!err) return 'Unknown error';
    if (err.response) {
      return `[HTTP ${err.response.status} on ${err.config?.url}]: ${err.response.data?.error || err.response.data?.message || err.response.statusText}`;
    }
    if (err.request) {
      return `[Network Error on ${err.config?.url}]: Server did not respond. Check backend daemon.`;
    }
    return err.message || String(err);
  };

  const handleRunAIAssessment = async () => {
    const error = validateVitalsBounds();
    if (error) {
      setVitalsError(error);
      setActiveTab('vitals');
      return;
    }
    setVitalsError(null);
    setLoadingAI(true);
    setApiError(null);

    try {
      const payload = {
        visit_id: visitId,
        patient_id: patientId,
        symptoms: symptomsText,
        symptom_duration: duration,
        medical_history: medicalHistory,
        vitals: vitals,
        verified_ocr_data: verifiedOCRData,
        vision_observation: visionObservation
      };

      const res = await api.post('/ai/assess', payload);
      setAiAssessment(res.data);
      setActiveTab('assessment');
    } catch (err) {
      console.error('AI Assessment Failed:', err);
      setApiError(formatApiError(err));
    } finally {
      setLoadingAI(false);
    }
  };

  const handlePushCaseToDoctor = async () => {
    setPushingToDoctor(true);
    setPushSuccess(false);

    try {
      await api.post('/consultations/push-case', {
        visit_id: visitId,
        patient_id: patientId,
        patient_name: patient?.full_name || patient?.name,
        patient_code: patient?.patient_code,
        village: patient?.village,
        risk_level: aiAssessment?.risk_level || 'MODERATE',
        reason: 'High Priority AI Case Assessment Review',
        ai_summary: aiAssessment,
        vision_observation: visionObservation,
        verified_ocr_data: verifiedOCRData
      });

      setPushSuccess(true);
    } catch (err) {
      console.error('Failed to push case to doctor:', err);
      alert('Failed to push case file to doctor database: ' + formatApiError(err));
    } finally {
      setPushingToDoctor(false);
    }
  };

  const handleExplicitStartVideoCall = async () => {
    const roomId = `room_PAT_${patient?.patient_code || 'RECORD'}_${Date.now()}`;
    try {
      await api.post('/consultations/ring-call', {
        visit_id: visitId,
        patient_id: patientId,
        patient_name: patient?.full_name || patient?.name,
        patient_code: patient?.patient_code,
        village: patient?.village,
        risk_level: aiAssessment?.risk_level || 'HIGH',
        reason: 'Emergency Teleconsultation Request from Village Sub-Centre',
        room_id: roomId
      }).catch(() => {});
    } catch (e) {}

    setActiveVideoRoom({
      room_id: roomId,
      user_name: 'Sunita Devi (Clinical Assistant)'
    });
  };

  const generateCompletePDFReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Clinical Assessment Report - ${patient?.full_name || 'Patient'}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 30px; color: #0F172A; line-height: 1.5; font-size: 13px; }
          .header { text-align: center; border-bottom: 2px solid #2563EB; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { margin: 0; color: #1E3A8A; font-size: 20px; text-transform: uppercase; }
          .header p { margin: 4px 0 0; color: #64748B; font-size: 11px; }
          .section { margin-bottom: 20px; border: 1px solid #E2E8F0; border-radius: 6px; padding: 14px; background: #FFFFFF; }
          .section-title { font-weight: bold; font-size: 13px; color: #1E3A8A; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-bottom: 10px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .field { font-size: 12px; }
          .label { font-weight: bold; color: #475569; }
          .value { color: #0F172A; }
          .wound-img { max-width: 100%; max-height: 220px; object-fit: contain; border-radius: 4px; border: 1px solid #CBD5E1; }
          .warning-box { background: #FFFBEB; border: 1px solid #FCD34D; color: #78350F; padding: 10px; border-radius: 6px; font-size: 11px; margin-top: 10px; }
          .footer { text-align: center; font-size: 10px; color: #94A3B8; margin-top: 30px; border-top: 1px solid #E2E8F0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Virtual Village Clinic — Official Clinical Visit Report</h1>
          <p>Generated on ${new Date().toLocaleString()} | Visit ID: ${visitId || 'N/A'}</p>
        </div>

        <div class="section">
          <div class="section-title">1. Patient Personal Details & Demographics</div>
          <div class="grid-3">
            <div class="field"><span class="label">Patient Name:</span> <span class="value">${patient?.full_name || patient?.name || 'N/A'}</span></div>
            <div class="field"><span class="label">Patient Code:</span> <span class="value">${patient?.patient_code || 'N/A'}</span></div>
            <div class="field"><span class="label">Age / Gender:</span> <span class="value">${patient?.age_years || patient?.age || 'N/A'} yrs / ${patient?.gender || 'N/A'}</span></div>
            <div class="field"><span class="label">Village / Location:</span> <span class="value">${patient?.village || 'N/A'}</span></div>
            <div class="field"><span class="label">Contact Phone:</span> <span class="value">${patient?.phone || 'N/A'}</span></div>
            <div class="field"><span class="label">Attending Assistant:</span> <span class="value">Sunita Devi (ANM)</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">2. Recorded Clinical Vitals (With Units)</div>
          <div class="grid-3">
            <div class="field"><span class="label">Body Temperature:</span> <span class="value">${vitals.temperature || '101.2'} °F</span></div>
            <div class="field"><span class="label">Blood Pressure:</span> <span class="value">${vitals.blood_pressure_systolic || '120'}/${vitals.blood_pressure_diastolic || '80'} mmHg</span></div>
            <div class="field"><span class="label">Pulse Rate:</span> <span class="value">${vitals.pulse || '88'} bpm</span></div>
            <div class="field"><span class="label">SpO2 Oxygen Saturation:</span> <span class="value">${vitals.spo2 || '97'} %</span></div>
            <div class="field"><span class="label">Respiratory Rate:</span> <span class="value">${vitals.respiratory_rate || '18'} /min</span></div>
            <div class="field"><span class="label">Weight / Height:</span> <span class="value">${vitals.weight || '62'} kg / ${vitals.height || '168'} cm</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">3. OCR-Extracted Prescription & Scanned Document Data</div>
          ${verifiedOCRData ? `
            <div class="field"><span class="label">Verified Medications:</span> <span class="value">${JSON.stringify(verifiedOCRData.medications || verifiedOCRData)}</span></div>
          ` : `
            <p style="color: #64748B;">No prescription document attached or verified during this visit.</p>
          `}
        </div>

        <div class="section">
          <div class="section-title">4. AI-Generated Clinical Summary & Guidance</div>
          <div class="field" style="margin-bottom: 8px;"><span class="label">Risk Status Level:</span> <span class="value" style="font-weight: bold; color: #DC2626;">${aiAssessment?.risk_level || 'MODERATE'}</span></div>
          <div class="field" style="margin-bottom: 8px;"><span class="label">Patient Summary:</span> <p class="value" style="margin: 4px 0;">${aiAssessment?.patient_summary || aiAssessment?.summary || symptomsText}</p></div>
          ${aiAssessment?.first_aid_steps ? `
            <div class="field"><span class="label">First-Aid Guidance Steps:</span>
              <ul>${aiAssessment.first_aid_steps.map(s => `<li>${s}</li>`).join('')}</ul>
            </div>
          ` : ''}
        </div>

        ${imagePreview || visionObservation ? `
          <div class="section">
            <div class="section-title">5. Clinical Wound Photo & Computer Vision Surface Analysis</div>
            ${imagePreview ? `<div style="text-align: center; margin-bottom: 10px;"><img src="${imagePreview}" class="wound-img" /></div>` : ''}
            <div class="field"><span class="label">Computer Vision Observation:</span> <span class="value">${visionObservation?.cautious_summary || 'Surface observation logged.'}</span></div>
          </div>
        ` : ''}

        <div class="warning-box">
          <strong>Clinical Disclaimer:</strong> This document contains AI-assisted preliminary triage data. Final medical diagnosis and treatment decisions are reserved for the attending Registered Medical Doctor.
        </div>

        <div class="footer">
          Virtual Village Clinic AI System | MoHFW Protocol Compliant | Confidential Medical Record
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/assistant/dashboard')} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" /> Patient Assessment & AI Clinical Visit
            </h1>
            <p className="text-xs text-slate-500">Digitize patient complaint, record vitals, upload documents/photos & generate AI assessment.</p>
          </div>
        </div>

        {patient && (
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
              {patient.full_name?.substring(0, 2) || 'PT'}
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">{patient.full_name || patient.name}</div>
              <div className="text-[11px] text-slate-500 font-mono">Code: {patient.patient_code}</div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-lg shadow-sm">
        <button
          onClick={() => setActiveTab('symptoms')}
          className={`py-3 px-4 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-colors ${activeTab === 'symptoms' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
        >
          <Mic className="w-4 h-4" /> 1. Symptoms & Voice
        </button>
        <button
          onClick={() => setActiveTab('vitals')}
          className={`py-3 px-4 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-colors ${activeTab === 'vitals' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
        >
          <HeartPulse className="w-4 h-4" /> 2. Vitals & Physical Signs
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`py-3 px-4 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-colors ${activeTab === 'documents' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
        >
          <FileText className="w-4 h-4" /> 3. Documents & Photos
        </button>
        <button
          onClick={() => setActiveTab('assessment')}
          className={`py-3 px-4 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-colors ${activeTab === 'assessment' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
        >
          <Bot className="w-4 h-4" /> 4. AI Assessment & Doctor Push
        </button>
      </div>

      {/* TAB 1: SYMPTOMS & VOICE INPUT */}
      {activeTab === 'symptoms' && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mic className="w-5 h-5 text-blue-600" /> Patient Chief Complaint & Multilingual Voice Assistant
            </h2>
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded border border-blue-200 font-semibold flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> {detectedLanguage}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chief Complaint & Symptoms (Hindi / English / Voice)</label>
              <div className="relative">
                <textarea
                  rows={4}
                  value={symptomsText}
                  onChange={(e) => setSymptomsText(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 focus:border-blue-500 outline-none leading-relaxed"
                  placeholder="Record symptoms using microphone or type here..."
                />
                <button
                  type="button"
                  onClick={recording ? handleStopVoiceRecording : handleStartVoiceRecording}
                  className={`absolute bottom-3 right-3 px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors ${recording ? 'bg-red-600 text-white animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {recording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {recording ? 'Stop Recording' : '🎤 Voice Input'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Symptom Duration</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Known Medical History / Chronic Illness</label>
                <input
                  type="text"
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveTab('vitals')}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition-colors"
              >
                NEXT: RECORD VITALS <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLINICAL VITALS WITH BOUNDS VALIDATION */}
      {activeTab === 'vitals' && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-blue-600" /> Patient Vitals & Clinical Physical Signs
            </h2>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-200 font-medium">
              Upper & Lower Limits Active
            </span>
          </div>

          {vitalsError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              {vitalsError}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Body Temp (°F) [95.0 - 107.0]</label>
              <input
                type="number"
                step="0.1"
                value={vitals.temperature}
                onChange={(e) => handleVitalsChange('temperature', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Systolic BP (mmHg) [60 - 250]</label>
              <input
                type="number"
                value={vitals.blood_pressure_systolic}
                onChange={(e) => handleVitalsChange('blood_pressure_systolic', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Diastolic BP (mmHg) [40 - 150]</label>
              <input
                type="number"
                value={vitals.blood_pressure_diastolic}
                onChange={(e) => handleVitalsChange('blood_pressure_diastolic', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pulse (bpm) [30 - 220]</label>
              <input
                type="number"
                value={vitals.pulse}
                onChange={(e) => handleVitalsChange('pulse', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SpO2 (%) [50 - 100]</label>
              <input
                type="number"
                value={vitals.spo2}
                onChange={(e) => handleVitalsChange('spo2', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Resp. Rate (/min) [8 - 60]</label>
              <input
                type="number"
                value={vitals.respiratory_rate}
                onChange={(e) => handleVitalsChange('respiratory_rate', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                value={vitals.weight}
                onChange={(e) => handleVitalsChange('weight', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Height (cm)</label>
              <input
                type="number"
                value={vitals.height}
                onChange={(e) => handleVitalsChange('height', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setActiveTab('symptoms')}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition-colors"
            >
              NEXT: DOCUMENTS & PHOTOS <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: DOCUMENTS OCR & WOUND PHOTOS */}
      {activeTab === 'documents' && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> Paper Prescription OCR & Wound Photo Vision Analysis
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Paper Prescription Upload */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" /> Upload Paper Prescription / Medical Record (OCR)
              </div>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleDocumentUpload}
                disabled={uploadingDoc}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              {uploadingDoc && (
                <div className="text-xs text-blue-600 flex items-center gap-2 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running Tesseract & Vision OCR Engine...
                </div>
              )}
              {verifiedOCRData && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                  ✓ Prescription OCR Data Verified & Attached to Visit Record.
                </div>
              )}
            </div>

            {/* Clinical Injury / Wound Photo Upload */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-purple-600" /> Upload Injury & Clinical Wound Photo (Computer Vision)
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
              />
              {imagePreview && (
                <div className="rounded-lg overflow-hidden border border-slate-200 max-h-40 bg-slate-100 flex items-center justify-center">
                  <img src={imagePreview} alt="Wound Preview" className="max-h-40 object-contain" />
                </div>
              )}
              {uploadingImage && (
                <div className="text-xs text-purple-600 flex items-center gap-2 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing Surface Erythema & Swelling...
                </div>
              )}
              {visionObservation && (
                <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-900 font-medium leading-relaxed">
                  <strong>Computer Vision Summary:</strong> {visionObservation.cautious_summary}
                </div>
              )}
            </div>

          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setActiveTab('vitals')}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleRunAIAssessment}
              disabled={loadingAI}
              className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-colors"
            >
              {loadingAI ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> RUNNING GROQ AI & RAG PROTOCOL...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4" /> RUN AI ASSESSMENT & RAG PROTOCOL SYSTEM <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: AI ASSESSMENT RESULTS & DOCTOR PUSH */}
      {activeTab === 'assessment' && (
        <div className="space-y-6">
          
          {apiError && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>AI Protocol Error: {apiError}</span>
              </div>
              <button onClick={handleRunAIAssessment} className="px-3 py-1.5 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700">
                Retry Assessment
              </button>
            </div>
          )}

          {aiAssessment ? (
            <div className="space-y-6">
              
              {/* Top Risk & Actions Banner */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <RiskBadge level={aiAssessment.risk_level} />
                    <span className="text-xs font-semibold text-slate-500">Visit ID: {visitId}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">AI Clinical Triage Synthesis Completed</h2>
                </div>

                <button
                  onClick={generateCompletePDFReport}
                  className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-colors"
                >
                  <Printer className="w-4 h-4 text-blue-400" /> 🖨️ GENERATE COMPLETE PDF REPORT
                </button>
              </div>

              {/* Patient Assessment Summary Box */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
                
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="font-bold text-xs text-blue-800 mb-1 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-blue-600" /> AI LLM Patient Assessment Summary
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {aiAssessment.patient_summary || aiAssessment.summary}
                  </p>
                </div>

                {/* Step-by-Step First Aid Guidance */}
                {aiAssessment.first_aid_steps && aiAssessment.first_aid_steps.length > 0 && (
                  <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-200 space-y-2">
                    <div className="font-bold text-xs text-emerald-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Immediate First-Aid Action Steps
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-800">
                      {aiAssessment.first_aid_steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">{idx+1}</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* PUSH CASE TO DOCTOR DATABASE & OPTIONAL EMERGENCY VIDEO CALL */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Send className="w-5 h-5 text-blue-600" /> Push Clinical Case File to Doctor Portal Database
                    </h3>
                    <p className="text-xs text-slate-500">Syncs patient vitals, AI summary, prescription OCR, & wound image to Doctor Database.</p>
                  </div>

                  {/* Doctor Selector */}
                  <select
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none font-semibold cursor-pointer"
                  >
                    <option value="Dr. Rajesh Sharma (AIIMS New Delhi)">Dr. Rajesh Sharma (AIIMS New Delhi) - General Physician</option>
                    <option value="Dr. Ananya Sen (JIPMER Puducherry)">Dr. Ananya Sen (JIPMER Puducherry) - Pediatrician</option>
                    <option value="Dr. Vikramaditya Rao (PGIMER Chandigarh)">Dr. Vikramaditya Rao (PGIMER Chandigarh) - Cardiologist</option>
                    <option value="Dr. Meera Nambiar (KEM Hospital Mumbai)">Dr. Meera Nambiar (KEM Hospital Mumbai) - Gynecologist</option>
                    <option value="Dr. Suresh Patel (BHU Varanasi)">Dr. Suresh Patel (BHU Varanasi) - Pulmonologist</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    onClick={handlePushCaseToDoctor}
                    disabled={pushingToDoctor}
                    className="w-full sm:w-auto px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Send className="w-4 h-4" /> {pushingToDoctor ? 'Pushing Data to Supabase DB...' : '🚀 PUSH CASE TO DOCTOR DATABASE'}
                  </button>

                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="w-full sm:w-auto px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Calendar className="w-4 h-4" /> 📅 SCHEDULE TELECONSULTATION CALL
                  </button>

                  <button
                    onClick={handleExplicitStartVideoCall}
                    className="w-full sm:w-auto px-5 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <PhoneCall className="w-4 h-4" /> 📹 START EMERGENCY VIDEO CALL (IF SEVERE)
                  </button>
                </div>

                {pushSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Case File Pushed Successfully! The Doctor can now view the wound photos, OCR prescription, and AI summary on their dashboard.
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white p-12 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-500 space-y-3">
              <Bot className="w-8 h-8 text-blue-600 mx-auto" />
              <p>Click "RUN AI ASSESSMENT & RAG PROTOCOL SYSTEM" to generate AI triage synthesis.</p>
            </div>
          )}

        </div>
      )}

      {/* OCR Mandatory Verification Modal */}
      {showOCRModal && currentDocument && (
        <OCRVerificationModal
          documentId={currentDocument.id}
          initialData={currentDocument.ocr_data}
          rawText={currentDocument.raw_text}
          onVerified={(data) => setVerifiedOCRData(data)}
          onClose={() => setShowOCRModal(false)}
        />
      )}

      {/* Schedule Call Modal */}
      {showScheduleModal && (
        <CallSchedulerModal
          patient={patient}
          visitId={visitId}
          onClose={() => setShowScheduleModal(false)}
          onScheduled={(call) => {
            alert(`Call scheduled successfully for ${new Date(call.scheduled_time).toLocaleString()}!`);
          }}
        />
      )}

      {/* Pure WebRTC Video Call Modal */}
      {activeVideoRoom && (
        <WebRTCVideoCallModal
          roomId={activeVideoRoom.room_id}
          userName={activeVideoRoom.user_name || 'Sunita Devi (Clinical Assistant)'}
          userId={`ast_${Date.now()}`}
          role="CLINIC_ASSISTANT"
          peerName={selectedDoctor}
          onClose={() => setActiveVideoRoom(null)}
        />
      )}

    </div>
  );
}
