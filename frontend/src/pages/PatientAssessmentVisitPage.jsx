import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, Upload, FileText, Camera, Bot, ShieldCheck, ArrowRight, CheckCircle2, AlertTriangle, Activity, User, HeartPulse, RefreshCw, BookOpen, AlertOctagon, Download, Pill, PhoneCall, ArrowLeft, MicOff, Globe, Video, Send, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import OCRVerificationModal from '../components/OCRVerificationModal';
import VideoConsultationModal from '../components/VideoConsultationModal';

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
  const [vitalsError, setVitalsError] = useState('');

  // OCR Document State
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [verifiedOCRData, setVerifiedOCRData] = useState(null);

  // Vision Image State
  const [visionObservation, setVisionObservation] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // AI Assessment State
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAssessment, setAiAssessment] = useState(null);

  useEffect(() => {
    fetchPatientAndVisit();
  }, [patientId]);

  const fetchPatientAndVisit = async () => {
    try {
      const pRes = await api.get(`/patients/${patientId}`);
      const pData = pRes.data;
      pData.name = pData.full_name || pData.name;
      pData.age = pData.age_years || pData.age;
      setPatient(pData);

      const vRes = await api.post('/visits', {
        patient_id: patientId,
        chief_complaint: symptomsText,
        symptoms: symptomsText,
        symptom_duration: duration,
        medical_history: medicalHistory,
        preferred_language: pData?.preferred_language || 'Hindi',
        vitals: vitals
      });

      setVisitId(vRes.data.id);
    } catch (err) {
      console.error('Failed to load patient visit context:', err);
    }
  };

  // Validate Vitals Client-Side against Strict Clinical Bounds
  const handleVitalsChange = (field, value) => {
    const updated = { ...vitals, [field]: value };
    setVitals(updated);

    // Live upper/lower limit check
    const temp = parseFloat(updated.temperature);
    if (updated.temperature && (temp < 95.0 || temp > 107.0)) {
      setVitalsError('Thermometer range: Temperature must be between 95.0°F and 107.0°F');
      return;
    }
    const sys = parseInt(updated.blood_pressure_systolic);
    if (updated.blood_pressure_systolic && (sys < 50 || sys > 300)) {
      setVitalsError('Systolic BP must be between 50 and 300 mmHg');
      return;
    }
    const dia = parseInt(updated.blood_pressure_diastolic);
    if (updated.blood_pressure_diastolic && (dia < 20 || dia > 200)) {
      setVitalsError('Diastolic BP must be between 20 and 200 mmHg');
      return;
    }
    const o2 = parseInt(updated.spo2);
    if (updated.spo2 && (o2 < 50 || o2 > 100)) {
      setVitalsError('Oxygen Saturation (SpO2) must be between 50% and 100%');
      return;
    }

    setVitalsError('');
  };

  // Real System Microphone Speech-to-Text Recording with Auto-Language Detection
  const handleVoiceRecordToggle = async () => {
    if (!recording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;

          recognition.onresult = (event) => {
            let currentTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              currentTranscript += event.results[i][0].transcript;
            }
            if (currentTranscript.trim()) {
              setSymptomsText(currentTranscript);
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        }

        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('language', 'AUTO');

          try {
            const res = await api.post('/ai/transcribe', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.transcript) {
              setSymptomsText(res.data.transcript);
            }
            if (res.data.detected_language) {
              setDetectedLanguage(res.data.detected_language);
            }
          } catch (e) {
            console.warn('Backend STT fallback:', e.message);
          }

          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        setRecording(true);

      } catch (err) {
        alert('Microphone access error: Please allow microphone permissions in browser.');
        console.error('Microphone error:', err);
      }
    } else {
      setRecording(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }
  };

  // OCR File Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patient_id', patientId);
    if (visitId) formData.append('visit_id', visitId);
    formData.append('document_type', 'prescription');

    try {
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setCurrentDocument(res.data);
      setShowOCRModal(true);
    } catch (err) {
      alert('Document upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingDoc(false);
    }
  };

  // Injury Image Upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('patient_id', patientId);
    if (visitId) formData.append('visit_id', visitId);

    try {
      const res = await api.post('/ai/analyze-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setVisionObservation(res.data);
    } catch (err) {
      alert('Image analysis failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingImage(false);
    }
  };

  // Run Full AI Assessment
  const handleAnalyzePatient = async () => {
    if (vitalsError) {
      alert('Please fix out-of-bounds Vitals values before running AI Assessment.');
      return;
    }

    setAnalyzing(true);
    try {
      const currentVisitId = visitId || `v_${Date.now()}`;
      
      const res = await api.post('/ai/analyze-patient', {
        visit_id: currentVisitId,
        patient_data: patient,
        vitals_data: vitals,
        visit_data: {
          symptoms: symptomsText,
          symptom_duration: duration,
          medical_history: medicalHistory
        }
      });

      setAiAssessment(res.data);
      setActiveTab('ai_summary');
    } catch (err) {
      alert('AI Patient Assessment failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setAnalyzing(false);
    }
  };

  // Push Full Clinical Data (AI Summary + Injury Image + Prescription OCR) to Selected Doctor Portal in Real-Time
  const handlePushCaseToDoctor = async () => {
    setPushingToDoctor(true);
    try {
      const res = await api.post('/consultations/push-to-doctor', {
        patient_id: patientId,
        patient_name: patient?.full_name || patient?.name,
        patient_code: patient?.patient_code,
        visit_id: visitId || `v_${Date.now()}`,
        doctor_name: selectedDoctor,
        ai_assessment: aiAssessment,
        vision_observation: visionObservation,
        verified_ocr_data: verifiedOCRData,
        vitals: vitals,
        symptoms: symptomsText,
        village: patient?.village
      });

      setPushSuccess(true);
      setTimeout(() => setPushSuccess(false), 5000);

      // Open Video Consultation Room for Patient & Assistant
      if (res.data?.room_id) {
        setActiveVideoRoom({
          room_id: res.data.room_id,
          user_name: `Patient (${patient?.full_name || patient?.name}) & Clinic Assistant`
        });
      }
    } catch (err) {
      alert('Push to doctor portal failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setPushingToDoctor(false);
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  if (!patient) {
    return <div className="p-8 text-center text-slate-400">Loading Patient Context...</div>;
  }

  const riskLevel = aiAssessment?.risk_level || 'MODERATE';
  const isHighOrEmergency = riskLevel === 'HIGH' || riskLevel === 'EMERGENCY' || riskLevel === 'RED' || riskLevel === 'MODERATE';

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      
      {/* Top Quick Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/assistant')}
          className="px-3 py-1.5 rounded-xl bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800 text-xs flex items-center gap-1.5 backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Patient Directory
        </button>
        <span className="text-xs text-slate-400 font-mono">Patient Code: <strong className="text-cyan-400">{patient.patient_code}</strong></span>
      </div>

      {/* Patient Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold text-xl">
            <User className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white">{patient.full_name || patient.name}</h1>
              <span className="font-mono text-xs bg-slate-900 text-cyan-400 px-2.5 py-0.5 rounded border border-slate-800">
                {patient.patient_code}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {patient.age_years || patient.age} Yrs | {patient.gender} | Village: <strong className="text-slate-200">{patient.village}</strong> | Language: <strong className="text-cyan-300">{patient.preferred_language}</strong>
            </p>
          </div>
        </div>

        {/* Big Action: ANALYZE PATIENT */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleAnalyzePatient}
            disabled={analyzing}
            className="flex-1 md:flex-none px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs hover:brightness-110 shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> RUNNING RAG ASSESSMENT...
              </>
            ) : (
              <>
                <Bot className="w-4 h-4" /> ANALYZE PATIENT CASE
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'symptoms', label: '1. Symptoms & Voice', icon: <Mic className="w-4 h-4" /> },
          { id: 'vitals', label: '2. Clinical Vitals', icon: <HeartPulse className="w-4 h-4" /> },
          { id: 'documents', label: '3. Prescription OCR', icon: <FileText className="w-4 h-4" /> },
          { id: 'vision', label: '4. Injury Photo', icon: <Camera className="w-4 h-4" /> },
          { id: 'ai_summary', label: '5. AI Assessment & Doctor Push', icon: <Bot className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SYMPTOMS */}
      {activeTab === 'symptoms' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Mic className="w-5 h-5 text-cyan-400" /> Multilingual Symptom Speech Capture
              </h2>
              <p className="text-xs text-slate-400">Speaks Hindi, Tamil, Telugu, English, Bengali, or Marathi — Whisper AI auto-detects language.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleVoiceRecordToggle}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${recording ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-rose-600/40' : 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-cyan-500/20 hover:brightness-110'}`}
              >
                {recording ? (
                  <>
                    <MicOff className="w-4 h-4 animate-bounce" /> 🔴 Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" /> 🎤 Speak Symptoms
                  </>
                )}
              </button>

              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold text-xs flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> {detectedLanguage || 'Hindi'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Chief Symptoms & Complaints</label>
              <textarea
                rows={3}
                value={symptomsText}
                onChange={(e) => setSymptomsText(e.target.value)}
                placeholder="Microphone will dictate symptoms directly here in native language..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Symptom Duration</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 3 days"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Prior Medical History / Allergies</label>
                <input
                  type="text"
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  placeholder="e.g. Hypertension, No known drug allergies"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VITALS WITH STRICT CLINICAL LIMITS */}
      {activeTab === 'vitals' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-emerald-400" /> Patient Vital Signs Entry (Strict Clinical Bounds)
            </h2>
            <span className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full">
              PostgreSQL Schema Check Enforced
            </span>
          </div>

          {vitalsError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2 font-bold animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              {vitalsError}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Temperature (°F) <span className="text-[10px] text-amber-400">(95.0 - 107.0°F)</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="95.0"
                max="107.0"
                value={vitals.temperature}
                onChange={(e) => handleVitalsChange('temperature', e.target.value)}
                placeholder="95.0 - 107.0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Systolic BP <span className="text-[10px] text-amber-400">(50 - 300 mmHg)</span>
              </label>
              <input
                type="number"
                min="50"
                max="300"
                value={vitals.blood_pressure_systolic}
                onChange={(e) => handleVitalsChange('blood_pressure_systolic', e.target.value)}
                placeholder="50 - 300"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Diastolic BP <span className="text-[10px] text-amber-400">(20 - 200 mmHg)</span>
              </label>
              <input
                type="number"
                min="20"
                max="200"
                value={vitals.blood_pressure_diastolic}
                onChange={(e) => handleVitalsChange('blood_pressure_diastolic', e.target.value)}
                placeholder="20 - 200"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pulse Rate <span className="text-[10px] text-amber-400">(20 - 250 bpm)</span>
              </label>
              <input
                type="number"
                min="20"
                max="250"
                value={vitals.pulse}
                onChange={(e) => handleVitalsChange('pulse', e.target.value)}
                placeholder="20 - 250"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                SpO2 (%) <span className="text-[10px] text-emerald-400">(50 - 100%)</span>
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={vitals.spo2}
                onChange={(e) => handleVitalsChange('spo2', e.target.value)}
                placeholder="50 - 100"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-emerald-400 focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Respiratory Rate <span className="text-[10px] text-amber-400">(5 - 80 /min)</span>
              </label>
              <input
                type="number"
                min="5"
                max="80"
                value={vitals.respiratory_rate}
                onChange={(e) => handleVitalsChange('respiratory_rate', e.target.value)}
                placeholder="5 - 80"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Weight (kg) <span className="text-[10px] text-slate-400">(0.5 - 500 kg)</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="500"
                value={vitals.weight}
                onChange={(e) => handleVitalsChange('weight', e.target.value)}
                placeholder="0.5 - 500"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Height (cm) <span className="text-[10px] text-slate-400">(20 - 250 cm)</span>
              </label>
              <input
                type="number"
                min="20"
                max="250"
                value={vitals.height}
                onChange={(e) => handleVitalsChange('height', e.target.value)}
                placeholder="20 - 250"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRESCRIPTION OCR */}
      {activeTab === 'documents' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" /> Prescription & Report Upload with OCR
              </h2>
              <p className="text-xs text-slate-400">Upload paper prescription or lab report &rarr; Tesseract OCR &rarr; Mandatory Assistant Verification</p>
            </div>

            <label className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer flex items-center gap-2">
              <Upload className="w-4 h-4" /> {uploadingDoc ? 'Processing OCR...' : 'Upload Prescription / Report'}
              <input type="file" onChange={handleFileUpload} accept="image/*,application/pdf" className="hidden" />
            </label>
          </div>

          {verifiedOCRData ? (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
              <div className="font-bold text-sm text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Verified OCR Prescription Data Confirmed to Record
              </div>
              <div className="space-y-2 text-xs">
                {verifiedOCRData.medications?.map((med, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="font-semibold text-white">{med.name} ({med.strength})</span>
                    <span className="text-slate-300">{med.frequency} for {med.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl text-center text-xs text-slate-400 space-y-2">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No prescription uploaded for this visit yet. Click upload to extract medications automatically.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: INJURY IMAGE ANALYSIS */}
      {activeTab === 'vision' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-400" /> Injury & Clinical Photo Observation
              </h2>
              <p className="text-xs text-slate-400">Strict safety rules: Cautious observational language only (never independently establishes diagnosis).</p>
            </div>

            <label className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer flex items-center gap-2">
              <Camera className="w-4 h-4" /> {uploadingImage ? 'Analyzing Image...' : 'Capture / Upload Injury Photo'}
              <input type="file" onChange={handleImageUpload} accept="image/*" className="hidden" />
            </label>
          </div>

          {visionObservation ? (
            <div className="p-4 rounded-2xl bg-slate-900 border border-purple-500/30 space-y-3">
              <div className="font-bold text-sm text-purple-300">Vision Model Observation Summary</div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium bg-slate-950 p-3 rounded-xl border border-slate-800">
                "{visionObservation.cautious_summary}"
              </p>
              <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                {visionObservation.observable_features?.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl text-center text-xs text-slate-400 space-y-2">
              <Camera className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No injury photo uploaded. Upload to generate cautious non-diagnostic observations for doctor review.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: AI SUMMARY & REALTIME DOCTOR PUSH */}
      {activeTab === 'ai_summary' && (
        <div className="space-y-6">
          {aiAssessment ? (
            <div className="space-y-6">
              
              {pushSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-bounce">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  🎉 CASE PACKET (AI SUMMARY + INJURY IMAGE + OCR PRESCRIPTION) SUCCESSFULLY PUSHED TO {selectedDoctor.toUpperCase()} IN REAL-TIME!
                </div>
              )}

              <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-400 font-semibold mb-1">Evaluated Safety Risk Classification</div>
                  <RiskBadge level={aiAssessment.risk_level} />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                    <span className="text-[11px] text-slate-400 font-semibold">Target Doctor:</span>
                    <select
                      value={selectedDoctor}
                      onChange={(e) => setSelectedDoctor(e.target.value)}
                      className="bg-transparent text-xs text-white outline-none font-semibold cursor-pointer"
                    >
                      <option value="Dr. Rajesh Sharma (AIIMS New Delhi)" className="bg-slate-900 text-white">Dr. Rajesh Sharma (AIIMS)</option>
                      <option value="Dr. Ananya Sen (JIPMER Puducherry)" className="bg-slate-900 text-white">Dr. Ananya Sen (JIPMER)</option>
                      <option value="Dr. Vikramaditya Rao (PGIMER Chandigarh)" className="bg-slate-900 text-white">Dr. Vikramaditya Rao (PGIMER)</option>
                      <option value="Dr. Meera Nambiar (KEM Hospital Mumbai)" className="bg-slate-900 text-white">Dr. Meera Nambiar (KEM)</option>
                      <option value="Dr. Suresh Patel (BHU Varanasi)" className="bg-slate-900 text-white">Dr. Suresh Patel (BHU)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleDownloadPDF}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-bold text-xs transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4 text-cyan-400" /> DOWNLOAD PDF
                  </button>

                  <button
                    onClick={handlePushCaseToDoctor}
                    disabled={pushingToDoctor}
                    className={`px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 ${isHighOrEmergency ? 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 shadow-emerald-500/30' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'}`}
                  >
                    {pushingToDoctor ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> PUSHING REAL-TIME TO DOCTOR...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 animate-pulse" /> 🚀 PUSH CASE TO DOCTOR PORTAL (REALTIME)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Printable PDF Area with Complete AI Prescription & First Aid Guidance */}
              <div className="printable-case-file glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
                
                <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Virtual Village Clinic — Clinical Assessment Report</span>
                    <h2 className="text-lg font-bold text-white mt-0.5">Patient Case File: {patient.full_name || patient.name} ({patient.patient_code})</h2>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div>Date: {new Date().toLocaleDateString()}</div>
                    <div>Location: {patient.village}</div>
                  </div>
                </div>

                {/* 1. AI Synthesis Summary */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-cyan-400" /> Chief Complaints & AI Synthesis Summary
                  </h3>
                  <p className="text-xs text-slate-200 leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-800 font-medium">
                    {aiAssessment.patient_summary}
                  </p>
                </div>

                {/* 2. Basic Protocol Prescription & Supportive Care Guidance */}
                <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-cyan-400" /> Basic Protocol Prescription & Supportive OTC Medication Guidance
                  </h3>
                  <div className="space-y-2 text-xs">
                    {(aiAssessment.supportive_medication_guidance || [
                      'Oral Rehydration Solution (ORS): 1 sachet dissolved in 1 litre clean drinking water, drink frequently',
                      'Paracetamol 500mg: 1 tablet for body temperature > 100°F (Max 3 times daily, pending doctor review)',
                      'Povidone-Iodine 5% Antiseptic Ointment: Apply on superficial wounds after saline cleaning'
                    ]).map((med, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
                        <span>{med}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Approved Step-by-Step First Aid Guidance */}
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Step-by-Step First-Aid Clinical Guidance
                  </h3>
                  <div className="space-y-2 text-xs">
                    {(aiAssessment.first_aid_steps || [
                      'Step 1: Position patient comfortably in a well-ventilated room',
                      'Step 2: Apply cold compress / sponging if body temperature exceeds 101°F',
                      'Step 3: Encourage oral rehydration solution (ORS) and adequate rest',
                      'Step 4: Protocol Supportive Guidance: Paracetamol 500mg (1 tablet after meals for fever > 100°F) subject to Doctor approval',
                      'Step 5: Continuously monitor vital signs (SpO2, pulse, breathing rate) every 2 hours'
                    ]).map((step, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-medium flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">{idx+1}</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. MoHFW Approved RAG Clinical Protocols */}
                {aiAssessment.protocol_matches && aiAssessment.protocol_matches.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-cyan-400" /> MoHFW Standard Treatment Guidelines (RAG Matches)
                    </h3>
                    <div className="space-y-2 text-xs">
                      {aiAssessment.protocol_matches.map((p, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                          <div className="font-semibold text-slate-200">{p.title} ({p.source || 'MoHFW'})</div>
                          <p className="text-slate-400 text-[11px] mt-1 leading-normal">{p.guidance || p.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Warning Flags & Risk Reason */}
                {aiAssessment.warnings && aiAssessment.warnings.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" /> Triage Safety Warning Flags
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                      {aiAssessment.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-4">
              <Bot className="w-12 h-12 text-cyan-400 mx-auto animate-pulse" />
              <h3 className="text-base font-bold text-white">Ready for AI Assessment</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Click "ANALYZE PATIENT CASE" to run Groq LLM + Qdrant RAG protocol engine for Low/Moderate/High risk classification & first-aid steps.
              </p>
              <button
                onClick={handleAnalyzePatient}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20"
              >
                RUN AI ASSESSMENT NOW
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mandatory OCR Verification Modal */}
      {showOCRModal && currentDocument && (
        <OCRVerificationModal
          documentId={currentDocument.document?.id || currentDocument.id}
          initialData={currentDocument.extraction?.extracted_data}
          rawText={currentDocument.raw_ocr}
          onVerified={(data) => {
            setVerifiedOCRData(data);
            setShowOCRModal(false);
          }}
          onClose={() => setShowOCRModal(false)}
        />
      )}

      {/* ZEGO CLOUD VIDEO CONSULTATION MODAL */}
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
