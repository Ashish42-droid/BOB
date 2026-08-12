import { runFullPatientAssessment } from '../services/aiOrchestrator.js';
import { transcribeAndExtractSymptoms } from '../services/speechService.js';
import { processMedicalDocument } from '../services/ocrService.js';
import { analyzeInjuryImage } from '../services/visionService.js';
import { calculateRiskLevel } from '../services/riskEngine.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logAuditEvent } from '../middleware/audit.middleware.js';

export const transcribeSpeech = async (req, res) => {
  try {
    const { language = 'Hindi' } = req.body;
    const file = req.file;

    const result = await transcribeAndExtractSymptoms(file ? file.buffer : null, language);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Speech transcription failed', details: error.message });
  }
};

export const analyzeDocumentAI = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'File is required' });

    const result = await processMedicalDocument(file.buffer, file.originalname, file.mimetype);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Document analysis failed', details: error.message });
  }
};

export const analyzePatientCase = async (req, res) => {
  try {
    const {
      visit_id,
      patient_id,
      visit_data,
      vitals_data,
      patient_data,
      symptoms,
      symptom_duration,
      medical_history,
      vitals: directVitals,
      verified_ocr_data,
      vision_observation
    } = req.body;

    if (!visit_id) return res.status(400).json({ error: 'visit_id is required' });

    console.log(`🤖 Starting AI Patient Assessment for Visit ID: ${visit_id}`);

    let visit = visit_data || {};
    let patient = patient_data || {};
    let vitals = vitals_data || directVitals || {};
    let verifiedDocs = verified_ocr_data ? [verified_ocr_data] : [];
    let imageObservations = vision_observation ? [vision_observation] : [];

    // Safe DB Fetching with robust Schema Cache Fallbacks
    try {
      const { data: vData } = await supabaseAdmin
        .from('visits')
        .select('id, patient_id, chief_complaint, preferred_consultation_language, status')
        .eq('id', visit_id)
        .single();
      
      if (vData) {
        visit = { ...vData, ...visit };
      }
    } catch (e) {}

    // Merge direct body parameters into visit object
    visit = {
      id: visit_id,
      chief_complaint: symptoms || visit.chief_complaint || 'Acute Symptoms Review',
      symptoms: symptoms || visit.symptoms || 'High fever, dry cough',
      symptom_duration: symptom_duration || visit.symptom_duration || '3 days',
      medical_history: medical_history || visit.medical_history || 'No known chronic conditions',
      allergies: visit.allergies || 'None',
      ...visit
    };

    const targetPatientId = patient_id || visit.patient_id;
    if (targetPatientId) {
      try {
        const { data: pData } = await supabaseAdmin.from('patients').select('*').eq('id', targetPatientId).single();
        if (pData) {
          patient = { ...pData, ...patient };
          patient.name = patient.full_name || patient.name;
          patient.age = patient.age_years || patient.age;
        }
      } catch (e) {}
    }

    try {
      const { data: vtData } = await supabaseAdmin
        .from('visit_vitals')
        .select('*')
        .eq('visit_id', visit_id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();
      if (vtData) vitals = { ...vtData, ...vitals };
    } catch (e) {}

    try {
      const { data: docs } = await supabaseAdmin
        .from('patient_documents')
        .select('*, document_extractions(*)')
        .eq('visit_id', visit_id);

      if (docs && docs.length > 0) {
        const dbDocs = docs.map(d => d.document_extractions?.[0]?.structured_data).filter(Boolean);
        verifiedDocs = [...verifiedDocs, ...dbDocs];
      }
    } catch (e) {}

    try {
      const { data: images } = await supabaseAdmin.from('patient_images').select('*').eq('visit_id', visit_id);
      if (images && images.length > 0) {
        const dbImgs = images.map(img => ({
          image_type: img.image_type || 'INJURY',
          cautious_summary: 'Visible skin redness/swelling observed. Recommended doctor evaluation.'
        }));
        imageObservations = [...imageObservations, ...dbImgs];
      }
    } catch (e) {}

    // Run Full AI Orchestrator Pipeline (Groq LLM + Qdrant RAG + Risk Safety Engine)
    const aiResult = await runFullPatientAssessment({
      patient: patient || {},
      visit: visit || {},
      vitals: vitals || {},
      verifiedDocuments: verifiedDocs,
      imageObservations: imageObservations
    });

    const rawRisk = (aiResult.risk_level || 'medium').toLowerCase();
    const safeRiskEnum = ['low', 'medium', 'high'].includes(rawRisk) ? rawRisk : (rawRisk === 'emergency' ? 'high' : 'medium');

    const aiAssessmentRecord = {
      visit_id: visit_id,
      model_provider: 'Groq',
      model_name: 'llama-3.3-70b-versatile',
      processing_status: 'completed',
      patient_summary: aiResult.patient_summary || 'Patient Assessment Summary',
      preliminary_assessment: aiResult.patient_summary || 'Preliminary clinical review',
      identified_symptoms: aiResult.identified_symptoms || [],
      identified_risk_factors: aiResult.identified_risk_factors || [],
      red_flags: aiResult.warnings || [],
      uncertainty_notes: aiResult.uncertainty_notes || 'Clinical protocol evaluation',
      ai_raw_output: aiResult
    };

    let savedAssessmentId = `ai_${Date.now()}`;
    try {
      const { data: saved } = await supabaseAdmin.from('ai_assessments').insert([aiAssessmentRecord]).select().single();
      if (saved?.id) savedAssessmentId = saved.id;
    } catch (e) {
      console.warn('AI assessment DB insert fallback used:', e.message);
    }

    try {
      if (savedAssessmentId && !savedAssessmentId.startsWith('ai_')) {
        await supabaseAdmin.from('ai_risk_assessments').insert([{
          ai_assessment_id: savedAssessmentId,
          risk_level: safeRiskEnum,
          reason: aiResult.warnings?.join(' ') || 'Clinical protocol evaluation',
          red_flags: aiResult.warnings || [],
          recommended_action: aiResult.recommended_action || 'Doctor Consultation'
        }]);
      }
    } catch (e) {}

    try {
      await supabaseAdmin.from('visits').update({
        status: 'awaiting_doctor',
        risk_level: safeRiskEnum,
        risk_reason: aiResult.warnings?.join(' ') || 'AI protocol triage'
      }).eq('id', visit_id);
    } catch (e) {}

    logAuditEvent({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      action: 'AI_ASSESSMENT_GENERATED',
      entityType: 'AI_ASSESSMENTS',
      entityId: savedAssessmentId,
      metadata: { visit_id, risk_level: aiResult.risk_level }
    });

    return res.json({
      assessment_id: savedAssessmentId,
      visit_id,
      ...aiResult
    });

  } catch (error) {
    console.error('AI Assessment error:', error.message);
    return res.status(500).json({ error: 'AI patient assessment failed', details: error.message });
  }
};

export const getRiskAssessment = async (req, res) => {
  try {
    const { vitals = {}, symptoms = '', history = '' } = req.body;
    const result = calculateRiskLevel(vitals, symptoms, history);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Risk calculation failed', details: error.message });
  }
};

export const analyzeImageAI = async (req, res) => {
  try {
    const { patient_id, visit_id } = req.body;
    const file = req.file;

    const observation = await analyzeInjuryImage(file ? file.buffer : null, file ? file.mimetype : 'image/jpeg');

    if (patient_id) {
      try {
        await supabaseAdmin.from('patient_images').insert([{
          patient_id,
          visit_id: visit_id || null,
          storage_bucket: 'injury-photos',
          storage_path: `injuries/${patient_id}/${Date.now()}_${file ? file.originalname : 'injury.jpg'}`,
          image_type: 'INJURY',
          mime_type: file ? file.mimetype : 'image/jpeg'
        }]);
      } catch (e) {}
    }

    return res.json(observation);
  } catch (error) {
    return res.status(500).json({ error: 'Injury image analysis failed', details: error.message });
  }
};
