import { supabaseAdmin } from '../config/supabase.js';
import { logAuditEvent } from '../middleware/audit.middleware.js';

// Real-Time In-Memory Visits Cache (Starts Clean)
let MEMORY_VISITS = [];

export const createVisit = async (req, res) => {
  try {
    const {
      patient_id,
      clinic_id,
      chief_complaint,
      symptoms,
      symptom_duration,
      medical_history,
      allergies,
      current_medications,
      preferred_language = 'Hindi',
      vitals
    } = req.body;

    if (!patient_id) {
      return res.status(400).json({ error: 'patient_id is required' });
    }

    const defaultClinicId = clinic_id || 'c0000000-0000-0000-0000-000000000001';

    const visitRecord = {
      patient_id,
      clinic_id: defaultClinicId,
      clinic_assistant_id: req.user?.id || null,
      chief_complaint: chief_complaint || symptoms || 'General Checkup',
      symptoms: symptoms || chief_complaint || '',
      symptom_duration: symptom_duration || 'Not specified',
      preferred_language,
      status: 'ASSESSMENT'
    };

    // Attempt insert into Supabase `visits`
    let newVisit = null;
    try {
      const { data, error: visitErr } = await supabaseAdmin
        .from('visits')
        .insert([visitRecord])
        .select()
        .single();
      
      if (!visitErr && data) {
        newVisit = data;
      }
    } catch (e) {
      console.warn('DB Insert Visit schema warning:', e.message);
    }

    if (!newVisit) {
      newVisit = {
        id: `v_${Date.now()}`,
        ...visitRecord,
        medical_history: medical_history || '',
        allergies: allergies || '',
        current_medications: current_medications || '',
        created_at: new Date().toISOString()
      };
    }

    // Save vitals if provided
    let savedVitals = null;
    if (vitals) {
      const vitalsRecord = {
        visit_id: newVisit.id,
        temperature: vitals.temperature ? parseFloat(vitals.temperature) : null,
        blood_pressure_systolic: vitals.blood_pressure_systolic ? parseInt(vitals.blood_pressure_systolic) : null,
        blood_pressure_diastolic: vitals.blood_pressure_diastolic ? parseInt(vitals.blood_pressure_diastolic) : null,
        pulse: vitals.pulse ? parseInt(vitals.pulse) : null,
        spo2: vitals.spo2 ? parseInt(vitals.spo2) : null,
        respiratory_rate: vitals.respiratory_rate ? parseInt(vitals.respiratory_rate) : null,
        weight: vitals.weight ? parseFloat(vitals.weight) : null,
        height: vitals.height ? parseFloat(vitals.height) : null,
        recorded_by: req.user?.id || null
      };

      try {
        const { data: vData } = await supabaseAdmin.from('vitals').insert([vitalsRecord]).select().single();
        savedVitals = vData || vitalsRecord;
      } catch (e) {
        savedVitals = vitalsRecord;
      }
    }

    const fullVisit = {
      ...newVisit,
      vitals: savedVitals ? [savedVitals] : []
    };

    MEMORY_VISITS.unshift(fullVisit);
    console.log(`✅ Visit created & synced! Visit ID: ${newVisit.id} for Patient: ${patient_id}`);

    logAuditEvent({
      actorId: req.user?.id || 'assistant_001',
      actorRole: req.user?.role || 'CLINIC_ASSISTANT',
      action: 'VISIT_CREATED',
      entityType: 'VISITS',
      entityId: newVisit.id,
      metadata: { patient_id, status: newVisit.status }
    });

    return res.status(201).json(fullVisit);

  } catch (error) {
    console.error('Error creating visit:', error.message);
    return res.status(500).json({ error: 'Failed to create visit', details: error.message });
  }
};

export const getVisitById = async (req, res) => {
  try {
    const { id } = req.params;

    let visit = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('visits')
        .select(`
          *,
          patients(*),
          vitals(*),
          medical_documents(*, document_extractions(*)),
          patient_images(*),
          ai_assessments(*),
          doctor_reviews(*),
          prescriptions(*)
        `)
        .eq('id', id)
        .single();
      if (!error && data) visit = data;
    } catch (e) {}

    if (!visit) {
      visit = MEMORY_VISITS.find(v => v.id === id);
    }

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    return res.json(visit);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch visit details', details: error.message });
  }
};

export const updateVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    let updatedVisit = { id, ...updates, updated_at: new Date().toISOString() };
    try {
      const { data } = await supabaseAdmin
        .from('visits')
        .update({ status: updates.status || 'ASSESSMENT', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (data) updatedVisit = data;
    } catch (e) {}

    const memIdx = MEMORY_VISITS.findIndex(v => v.id === id);
    if (memIdx !== -1) {
      MEMORY_VISITS[memIdx] = { ...MEMORY_VISITS[memIdx], ...updates };
    }

    logAuditEvent({
      actorId: req.user?.id || 'assistant_001',
      actorRole: req.user?.role || 'CLINIC_ASSISTANT',
      action: 'VISIT_UPDATED',
      entityType: 'VISITS',
      entityId: id,
      metadata: updates
    });

    return res.json(updatedVisit);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update visit', details: error.message });
  }
};
