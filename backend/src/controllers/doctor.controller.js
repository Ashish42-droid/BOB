import { supabaseAdmin } from '../config/supabase.js';
import { logAuditEvent } from '../middleware/audit.middleware.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuid = (v) => (typeof v === 'string' && UUID_RE.test(v) ? v : null);

const RISK_ORDER = { high: 0, medium: 1, low: 2 };

/**
 * GET /api/doctor/queue — triage queue sorted HIGH -> MEDIUM -> LOW, newest first.
 */
export const getDoctorQueue = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('visits')
      .select(`
        *,
        patients (*),
        visit_vitals (*),
        ai_assessments (id, patient_summary, ai_raw_output, created_at, ai_risk_assessments (risk_level, reason, recommended_action))
      `)
      .in('status', ['awaiting_doctor', 'consultation_scheduled', 'under_consultation', 'ai_processing', 'open'])
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Doctor queue fetch error:', error.message);
      return res.json([]);
    }

    const queue = (data || [])
      .map((item) => {
        if (item.patients) {
          item.patients.name = item.patients.full_name || item.patients.name;
          item.patients.age = item.patients.age_years || item.patients.age;
        }
        // Latest assessment first
        if (Array.isArray(item.ai_assessments)) {
          item.ai_assessments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        return item;
      })
      .sort((a, b) => {
        const rank = (RISK_ORDER[a.risk_level] ?? 3) - (RISK_ORDER[b.risk_level] ?? 3);
        return rank !== 0 ? rank : new Date(b.created_at) - new Date(a.created_at);
      });

    return res.json(queue);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/doctor/cases/:id — complete case file: patient, vitals, AI summary,
 * recommendations, OCR documents, wound photos (public URLs), consultations.
 */
export const getDoctorCaseDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: visitData, error } = await supabaseAdmin
      .from('visits')
      .select(`
        *,
        patients (*),
        visit_vitals (*),
        ai_assessments (*, ai_risk_assessments (*), ai_recommendations (*)),
        patient_documents (*, document_extractions (*)),
        patient_images (*),
        consultations (*),
        referrals (*)
      `)
      .eq('id', id)
      .single();

    if (error || !visitData) {
      return res.status(404).json({ error: 'Case file not found in the database.' });
    }

    if (visitData.patients) {
      visitData.patients.name = visitData.patients.full_name || visitData.patients.name;
      visitData.patients.age = visitData.patients.age_years || visitData.patients.age;
    }

    // Latest assessment first
    if (Array.isArray(visitData.ai_assessments)) {
      visitData.ai_assessments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Public URLs for stored files
    if (Array.isArray(visitData.patient_images)) {
      visitData.patient_images = visitData.patient_images.map((img) => {
        const { data: pub } = supabaseAdmin.storage.from(img.storage_bucket).getPublicUrl(img.storage_path);
        return { ...img, image_url: pub?.publicUrl || null };
      });
    }
    if (Array.isArray(visitData.patient_documents)) {
      visitData.patient_documents = visitData.patient_documents.map((doc) => {
        const { data: pub } = supabaseAdmin.storage.from(doc.storage_bucket).getPublicUrl(doc.storage_path);
        return { ...doc, file_url: pub?.publicUrl || null };
      });
    }

    return res.json(visitData);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/doctor/cases/:id/review
 * Persists the doctor's decision to doctor_decisions and any prescription to
 * prescriptions + prescription_items, then closes the visit.
 */
export const recordDoctorReview = async (req, res) => {
  try {
    const visitId = asUuid(req.body.visit_id || req.params.id);
    const {
      doctor_diagnosis,
      doctor_notes,
      prescriptions = [],
      advice,
      referral_needed = false,
      referral_hospital
    } = req.body;

    if (!visitId) {
      return res.status(400).json({ error: 'A valid visit_id is required.' });
    }
    if (!doctor_diagnosis && !doctor_notes) {
      return res.status(400).json({ error: 'Provide a diagnosis or clinical notes before saving the review.' });
    }

    const doctorStaffId = asUuid(req.user?.id);

    // 1. Find or create the consultation this decision belongs to
    let { data: consultation } = await supabaseAdmin
      .from('consultations')
      .select('id, status')
      .eq('visit_id', visitId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!consultation) {
      const { data: created, error: conErr } = await supabaseAdmin
        .from('consultations')
        .insert([{
          visit_id: visitId,
          consultation_type: 'video',
          status: 'completed',
          meeting_room_id: `room_review_${Date.now()}`,
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString()
        }])
        .select()
        .single();
      if (conErr) {
        return res.status(500).json({ error: 'Could not create the consultation record.', details: conErr.message });
      }
      consultation = created;
    }

    // 2. Doctor decision (one per consultation — upsert on conflict)
    const decisionType = referral_needed ? 'hospital_referral' : (prescriptions.length > 0 ? 'prescription' : 'continue_protocol');
    const { data: decision, error: decErr } = await supabaseAdmin
      .from('doctor_decisions')
      .upsert([{
        consultation_id: consultation.id,
        doctor_id: doctorStaffId,
        decision_type: decisionType,
        clinical_notes: [doctor_notes, advice].filter(Boolean).join('\n') || 'Reviewed.',
        diagnosis: doctor_diagnosis || null,
        referral_facility: referral_needed ? (referral_hospital || 'District Hospital') : null,
        referral_reason: referral_needed ? (doctor_diagnosis || 'Specialist evaluation required') : null
      }], { onConflict: 'consultation_id' })
      .select()
      .single();

    if (decErr) {
      return res.status(500).json({ error: 'Doctor decision could not be saved.', details: decErr.message });
    }

    // 3. Prescription + items
    let savedPrescription = null;
    if (Array.isArray(prescriptions) && prescriptions.length > 0) {
      const { data: rx, error: rxErr } = await supabaseAdmin
        .from('prescriptions')
        .insert([{
          consultation_id: consultation.id,
          visit_id: visitId,
          doctor_id: doctorStaffId,
          prescription_number: `RX-${Date.now()}`,
          notes: advice || null
        }])
        .select()
        .single();

      if (rxErr) {
        console.warn('prescriptions insert failed:', rxErr.message);
      } else {
        savedPrescription = rx;
        const items = prescriptions.map((p) => ({
          prescription_id: rx.id,
          medicine_name: p.name || p.medicine_name || 'Medication',
          strength: p.strength || null,
          dosage: p.dosage || p.strength || '1 unit',
          frequency: p.frequency || 'As directed',
          route: p.route || 'Oral',
          instructions: p.instructions || p.duration || null
        }));
        const { error: itemErr } = await supabaseAdmin.from('prescription_items').insert(items);
        if (itemErr) console.warn('prescription_items insert failed:', itemErr.message);
      }
    }

    // 4. Mark AI recommendations reviewed by the doctor
    const { data: assessment } = await supabaseAdmin
      .from('ai_assessments')
      .select('id')
      .eq('visit_id', visitId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (assessment) {
      await supabaseAdmin
        .from('ai_recommendations')
        .update({ status: 'doctor_approved', doctor_id: doctorStaffId, reviewed_at: new Date().toISOString() })
        .eq('ai_assessment_id', assessment.id)
        .eq('status', 'ai_suggested');
    }

    // 5. Close out the visit + consultation
    await supabaseAdmin
      .from('visits')
      .update({ status: referral_needed ? 'referred' : 'completed', completed_at: new Date().toISOString() })
      .eq('id', visitId);
    await supabaseAdmin
      .from('consultations')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', consultation.id);

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: 'DOCTOR',
      action: 'DOCTOR_DECISION_FINALIZED',
      entityType: 'DOCTOR_DECISIONS',
      entityId: decision.id,
      metadata: { visit_id: visitId, decision_type: decisionType, prescription_id: savedPrescription?.id }
    });

    return res.status(201).json({
      message: 'Doctor review saved: decision, prescription and visit status recorded.',
      decision,
      prescription: savedPrescription
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/doctor/cases/:id/refer — emergency/urgent hospital referral.
 */
export const referPatientToHospital = async (req, res) => {
  try {
    const visitId = asUuid(req.body.visit_id || req.params.id);
    const { referral_hospital, urgency = 'urgent', notes } = req.body;

    if (!visitId) {
      return res.status(400).json({ error: 'A valid visit_id is required.' });
    }

    const urgencyEnum = { immediate: 'immediate', emergency: 'immediate', high: 'urgent', urgent: 'urgent', routine: 'routine', low: 'routine' }[String(urgency).toLowerCase()] || 'urgent';

    const { data: referral, error } = await supabaseAdmin
      .from('referrals')
      .insert([{
        visit_id: visitId,
        doctor_id: asUuid(req.user?.id),
        referral_urgency: urgencyEnum,
        destination_facility: referral_hospital || 'District Hospital',
        reason: notes || 'Urgent specialist escalation required'
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Referral could not be saved.', details: error.message });
    }

    await supabaseAdmin.from('visits').update({ status: 'referred' }).eq('id', visitId);

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: 'DOCTOR',
      action: 'PATIENT_REFERRED',
      entityType: 'REFERRALS',
      entityId: referral.id,
      metadata: { visit_id: visitId, urgency: urgencyEnum, destination: referral.destination_facility }
    });

    return res.json({ message: 'Referral recorded and visit marked as referred.', referral });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Aliases
export const getVisitDetails = getDoctorCaseDetails;
export const submitDoctorReview = recordDoctorReview;
