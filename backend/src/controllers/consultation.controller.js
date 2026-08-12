import { supabaseAdmin } from '../config/supabase.js';
import { logAuditEvent } from '../middleware/audit.middleware.js';

/**
 * Teleconsultation lifecycle controller.
 *
 * Persistence model (live schema):
 *  - appointments   : the scheduled slot (appointment_code, doctor, risk, reason)
 *  - consultations  : the video-call session (status: waiting|active|completed|cancelled,
 *                     meeting_room_id, started_at, ended_at)
 * Rich display fields (patient name/code, doctor name, risk) are joined from
 * visits/patients at read time. A small in-memory overlay carries transient
 * call state (e.g. incoming-call ring) that has no schema column.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuid = (v) => (typeof v === 'string' && UUID_RE.test(v) ? v : null);

// Transient overlay: consultationId -> { ringing, scheduled_time, doctor_name, ... }
const CALL_OVERLAY = new Map();

async function getDefaultDoctor() {
  const { data } = await supabaseAdmin
    .from('doctor_profiles')
    .select('staff_id, specialization, staff_profiles(full_name)')
    .limit(1)
    .maybeSingle();
  return data
    ? { id: data.staff_id, name: data.staff_profiles?.full_name || 'Doctor', specialization: data.specialization }
    : null;
}

async function createConsultationRecord({ visitId, appointmentId = null, roomId }) {
  const { data, error } = await supabaseAdmin
    .from('consultations')
    .insert([{
      visit_id: asUuid(visitId),
      appointment_id: appointmentId,
      consultation_type: 'video',
      status: 'waiting',
      meeting_room_id: roomId
    }])
    .select()
    .single();
  if (error) {
    console.error('consultations insert FAILED:', error.message);
    return null;
  }
  return data;
}

/**
 * POST /api/consultations/push-case
 * Sends the completed AI case file to the doctor queue and opens a waiting
 * video room. The AI summary itself is already persisted in ai_assessments.
 */
export const pushToDoctor = async (req, res) => {
  try {
    const { patient_id, patient_name, patient_code, visit_id, doctor_name, ai_assessment } = req.body;

    if (!patient_id || !visit_id) {
      return res.status(400).json({ error: 'patient_id and visit_id are required' });
    }

    const cleanCode = (patient_code || 'PAT').replace(/[^a-zA-Z0-9]/g, '_');
    const roomId = `room_${cleanCode}_${Date.now()}`;

    const consultation = await createConsultationRecord({ visitId: visit_id, roomId });

    // Ensure the visit is flagged for the doctor queue
    const { error: visitErr } = await supabaseAdmin
      .from('visits')
      .update({ status: 'awaiting_doctor' })
      .eq('id', visit_id);
    if (visitErr) console.warn('visits status update failed:', visitErr.message);

    if (consultation) {
      CALL_OVERLAY.set(consultation.id, {
        patient_name: patient_name || 'Patient',
        patient_code: patient_code || 'PAT-RECORD',
        doctor_name: doctor_name || 'On-call Doctor',
        risk_level: (ai_assessment?.risk_level || 'MEDIUM').toUpperCase(),
        reason: ai_assessment?.patient_summary?.slice(0, 200) || 'AI case assessment review',
        ringing: false
      });
    }

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      action: 'CASE_PUSHED_TO_DOCTOR',
      entityType: 'CONSULTATIONS',
      entityId: consultation?.id,
      metadata: { patient_id, visit_id, risk_level: ai_assessment?.risk_level }
    });

    return res.status(201).json({
      message: 'Case file sent to the doctor queue.',
      consultation: consultation
        ? { ...consultation, ...CALL_OVERLAY.get(consultation.id) }
        : { visit_id, room_id: roomId, persisted: false },
      room_id: roomId,
      persisted: Boolean(consultation)
    });
  } catch (error) {
    console.error('Error pushing case to doctor:', error.message);
    return res.status(500).json({ error: 'Failed to push case to doctor', details: error.message });
  }
};

/**
 * POST /api/consultations/ring  — request an immediate emergency video call.
 */
export const ringCall = async (req, res) => {
  try {
    const { patient_id, patient_name, patient_code, visit_id, risk_level, reason, room_id } = req.body;

    const roomId = room_id || `room_${(patient_code || 'PAT').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    const consultation = await createConsultationRecord({ visitId: visit_id, roomId });

    if (consultation) {
      CALL_OVERLAY.set(consultation.id, {
        patient_name: patient_name || 'Patient',
        patient_code: patient_code || 'PAT-RECORD',
        risk_level: (risk_level || 'HIGH').toUpperCase(),
        reason: reason || 'Emergency teleconsultation request',
        ringing: true
      });
    }

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      action: 'EMERGENCY_CALL_REQUESTED',
      entityType: 'CONSULTATIONS',
      entityId: consultation?.id,
      metadata: { patient_id, visit_id, risk_level }
    });

    return res.status(201).json({
      message: 'Emergency video-call request sent to the doctor.',
      consultation: consultation ? { ...consultation, ...CALL_OVERLAY.get(consultation.id) } : { room_id: roomId },
      room_id: roomId
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to request emergency call', details: error.message });
  }
};

/**
 * POST /api/consultations/schedule — book an appointment + waiting video room.
 */
export const scheduleConsultation = async (req, res) => {
  try {
    const {
      patient_id,
      patient_name,
      patient_code,
      visit_id,
      doctor_id,
      doctor_name,
      scheduled_time,
      risk_level = 'MEDIUM',
      reason = 'Teleconsultation review'
    } = req.body;

    if (!patient_id) {
      return res.status(400).json({ error: 'patient_id is required' });
    }

    const roomId = `room_${(patient_code || 'PAT').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    const defaultDoctor = await getDefaultDoctor();
    const doctorId = asUuid(doctor_id) || defaultDoctor?.id || null;
    const when = scheduled_time || new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 1. Appointment (the scheduled slot)
    let appointment = null;
    if (asUuid(patient_id) && asUuid(visit_id) && doctorId) {
      const riskEnum = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' }[String(risk_level).toUpperCase()] || 'medium';
      const { data, error } = await supabaseAdmin
        .from('appointments')
        .insert([{
          appointment_code: `APT-${Date.now()}`,
          patient_id,
          visit_id,
          doctor_id: doctorId,
          risk_level: riskEnum,
          status: 'scheduled',
          reason: `${reason} | Scheduled for: ${when}`,
          booked_by: asUuid(req.user?.id)
        }])
        .select()
        .single();
      if (error) console.warn('appointments insert failed:', error.message);
      else appointment = data;
    }

    // 2. Consultation (the video room, waiting until joined)
    const consultation = await createConsultationRecord({
      visitId: visit_id,
      appointmentId: appointment?.id || null,
      roomId
    });

    if (asUuid(visit_id)) {
      await supabaseAdmin.from('visits').update({ status: 'consultation_scheduled' }).eq('id', visit_id);
    }

    if (consultation) {
      CALL_OVERLAY.set(consultation.id, {
        patient_name: patient_name || 'Patient',
        patient_code: patient_code || 'PAT-RECORD',
        doctor_name: doctor_name || defaultDoctor?.name || 'On-call Doctor',
        risk_level: String(risk_level).toUpperCase(),
        scheduled_time: when,
        reason,
        ringing: false
      });
    }

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      action: 'CONSULTATION_SCHEDULED',
      entityType: 'CONSULTATIONS',
      entityId: consultation?.id,
      metadata: { patient_id, visit_id, scheduled_time: when, risk_level }
    });

    return res.status(201).json({
      message: 'Video consultation scheduled.',
      consultation: consultation
        ? { ...consultation, ...CALL_OVERLAY.get(consultation.id), appointment_id: appointment?.id }
        : { room_id: roomId, persisted: false },
      room_id: roomId,
      persisted: Boolean(consultation)
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to schedule consultation', details: error.message });
  }
};

/**
 * GET /api/consultations — active + waiting consultations with joined context.
 */
export const getConsultations = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('consultations')
      .select('*, visits(id, visit_code, risk_level, chief_complaint, patients(id, full_name, patient_code, village))')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('consultations fetch failed:', error.message);
      return res.json([]);
    }

    const enriched = (data || []).map((c) => {
      const overlay = CALL_OVERLAY.get(c.id) || {};
      return {
        ...c,
        room_id: c.meeting_room_id,
        patient_name: overlay.patient_name || c.visits?.patients?.full_name || 'Patient',
        patient_code: overlay.patient_code || c.visits?.patients?.patient_code || '',
        village: c.visits?.patients?.village || '',
        risk_level: overlay.risk_level || (c.visits?.risk_level || 'medium').toUpperCase(),
        reason: overlay.reason || c.visits?.chief_complaint || '',
        doctor_name: overlay.doctor_name || 'On-call Doctor',
        scheduled_time: overlay.scheduled_time || c.created_at,
        ringing: Boolean(overlay.ringing) && c.status === 'waiting'
      };
    });

    return res.json(enriched);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch consultations', details: error.message });
  }
};

export const declineConsultation = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin.from('consultations').update({ status: 'cancelled' }).eq('id', asUuid(id));
    if (error) console.warn('consultation decline update failed:', error.message);
    const overlay = CALL_OVERLAY.get(id);
    if (overlay) overlay.ringing = false;

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      action: 'CONSULTATION_DECLINED',
      entityType: 'CONSULTATIONS',
      entityId: id
    });

    return res.json({ message: 'Consultation declined.', status: 'cancelled' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/consultations/:id/join — explicit user action to enter the room.
 */
export const joinConsultation = async (req, res) => {
  try {
    const { id } = req.params;

    let consult = null;
    if (asUuid(id)) {
      const { data } = await supabaseAdmin.from('consultations').select('*').eq('id', id).maybeSingle();
      consult = data;
    }
    if (!consult) {
      // Allow joining by room id as well
      const { data } = await supabaseAdmin.from('consultations').select('*').eq('meeting_room_id', id).maybeSingle();
      consult = data;
    }

    if (consult?.status === 'completed') {
      return res.status(400).json({ error: 'This consultation has already ended.', status: 'completed' });
    }

    const roomId = consult?.meeting_room_id || `room_${id.replace(/[^a-zA-Z0-9]/g, '_')}`;

    if (consult) {
      const { error } = await supabaseAdmin
        .from('consultations')
        .update({ status: 'active', started_at: consult.started_at || new Date().toISOString() })
        .eq('id', consult.id);
      if (error) console.warn('consultation join update failed:', error.message);
      const overlay = CALL_OVERLAY.get(consult.id);
      if (overlay) overlay.ringing = false;
    }

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      action: 'CONSULTATION_JOINED',
      entityType: 'CONSULTATIONS',
      entityId: consult?.id || id
    });

    return res.json({
      message: 'Joining video consultation room.',
      consultation_id: consult?.id || id,
      room_id: roomId,
      status: 'active',
      user_id: req.user?.id || `user_${Date.now()}`,
      user_name: req.user?.name || (req.user?.role === 'DOCTOR' ? 'Doctor' : 'Clinic Assistant')
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to join video consultation', details: error.message });
  }
};

export const createConsultation = async (req, res) => scheduleConsultation(req, res);
export const startConsultation = async (req, res) => joinConsultation(req, res);

export const endConsultation = async (req, res) => {
  try {
    const { id } = req.params;

    const target = asUuid(id);
    if (target) {
      const { error } = await supabaseAdmin
        .from('consultations')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('id', target);
      if (error) console.warn('consultation end update failed:', error.message);
    }
    CALL_OVERLAY.delete(id);

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      action: 'CONSULTATION_ENDED',
      entityType: 'CONSULTATIONS',
      entityId: id
    });

    return res.json({ message: 'Consultation completed.', status: 'completed' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to end consultation', details: error.message });
  }
};
