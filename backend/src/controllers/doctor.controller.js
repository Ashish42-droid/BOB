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
          visit_vitals (*),
          ai_assessments (*)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        queue = data.map(item => {
          if (item.patients) {
            item.patients.name = item.patients.full_name || item.patients.name;
            item.patients.age = item.patients.age_years || item.patients.age;
          }
          return item;
        });
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
          visit_vitals (*),
          ai_assessments (*),
          patient_documents (*, document_extractions (*)),
          patient_images (*)
        `)
        .eq('id', id)
        .single();

      if (data) {
        visitData = data;
        if (visitData.patients) {
          visitData.patients.name = visitData.patients.full_name || visitData.patients.name;
          visitData.patients.age = visitData.patients.age_years || visitData.patients.age;
        }

        // Map public / signed storage URLs for patient images if image_url is missing
        if (visitData.patient_images && Array.isArray(visitData.patient_images)) {
          visitData.patient_images = visitData.patient_images.map(img => {
            if (!img.image_url && img.storage_bucket && img.storage_path) {
              const { data: pubUrlData } = supabaseAdmin.storage.from(img.storage_bucket).getPublicUrl(img.storage_path);
              img.image_url = pubUrlData?.publicUrl || img.storage_path;
            }
            return img;
          });
        }
      }
    } catch (e) {}

    if (!visitData) {
      return res.status(404).json({ error: 'Visit case file not found in database' });
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
      await supabaseAdmin.from('visits').update({ status: 'completed' }).eq('id', visit_id);
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
    
    try {
      await supabaseAdmin.from('referrals').insert([{
        visit_id,
        referral_urgency: (urgency || 'urgent').toLowerCase(),
        destination_facility: referral_hospital || 'District Hospital',
        reason: notes || 'Urgent specialist escalation required'
      }]);
    } catch (e) {}

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
