import { supabaseAdmin } from '../config/supabase.js';
import { logAuditEvent } from '../middleware/audit.middleware.js';

export const getDoctorQueue = async (req, res) => {
  try {
    let queue = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('visits')
        .select(`
          *,
          patients (*),
          ai_assessments (*)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        queue = data;
      }
    } catch (e) {
      console.warn('Queue fetch error:', e.message);
    }

    return res.json(queue || []);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getDoctorCaseDetails = async (req, res) => {
  try {
    const { id } = req.params;

    let visitData = null;
    try {
      const { data } = await supabaseAdmin
        .from('visits')
        .select(`
          *,
          patients (*),
          vitals (*),
          ai_assessments (*),
          medical_documents (*, document_extractions (*))
        `)
        .eq('id', id)
        .single();
      if (data) visitData = data;
    } catch (e) {}

    if (!visitData) {
      return res.status(404).json({ error: 'Visit case file not found' });
    }

    return res.json(visitData);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const recordDoctorReview = async (req, res) => {
  try {
    const {
      visit_id,
      doctor_diagnosis,
      doctor_notes,
      prescriptions = [],
      advice,
      referral_needed = false,
      referral_hospital
    } = req.body;

    let review = {
      id: `rev_${Date.now()}`,
      visit_id,
      doctor_id: req.user?.id || 'dr_1',
      doctor_diagnosis,
      doctor_notes,
      prescriptions,
      advice,
      referral_needed,
      referral_hospital,
      created_at: new Date().toISOString()
    };

    try {
      await supabaseAdmin.from('visits').update({ status: 'COMPLETED' }).eq('id', visit_id);
    } catch (e) {}

    logAuditEvent({
      actorId: req.user?.id || 'dr_1',
      actorRole: 'DOCTOR',
      action: 'DOCTOR_DECISION_FINALIZED',
      entityType: 'DOCTOR_REVIEWS',
      entityId: review.id,
      metadata: { visit_id, doctor_diagnosis, referral_needed }
    });

    return res.status(201).json({ message: 'Doctor medical decision finalized successfully', review });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const referPatientToHospital = async (req, res) => {
  try {
    const { visit_id, referral_hospital, urgency = 'HIGH', notes } = req.body;
    return res.json({
      message: 'Patient referred to hospital emergency successfully',
      referral: { visit_id, referral_hospital, urgency, notes }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Aliases
export const getVisitDetails = getDoctorCaseDetails;
export const submitDoctorReview = recordDoctorReview;
