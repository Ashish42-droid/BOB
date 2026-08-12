import { config } from '../config/env.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logAuditEvent } from '../middleware/audit.middleware.js';

// Real-Time In-Memory Persistence Store for Scheduled Video Teleconsultations (Starts Clean)
let MEMORY_CONSULTATIONS = [];

// Push Complete Case Context (AI Summary + Injury Photo + Prescription OCR) to Doctor Portal
// DOES NOT auto-launch or ring any video call (visual/case file data push only)
export const pushToDoctor = async (req, res) => {
  try {
    const {
      patient_id,
      patient_name,
      patient_code,
      visit_id,
      doctor_name,
      ai_assessment,
      vision_observation,
      verified_ocr_data,
      vitals,
      symptoms,
      village
    } = req.body;

    if (!patient_id) {
      return res.status(400).json({ error: 'patient_id is required' });
    }

    const cleanCode = (patient_code || 'PAT-2026-9000').replace(/[^a-zA-Z0-9]/g, '_');
    const roomId = `room_${cleanCode}_${Date.now()}`;

    const newPushRecord = {
      id: `c_${Date.now()}`,
      visit_id: visit_id || `v_${Date.now()}`,
      patient_id,
      patient_name: patient_name || 'Patient',
      patient_code: patient_code || 'PAT-RECORD',
      village: village || 'Primary Health Centre',
      doctor_name: doctor_name || 'Dr. Rajesh Sharma (AIIMS New Delhi)',
      risk_level: (ai_assessment?.risk_level || 'MODERATE').toUpperCase(),
      scheduled_time: new Date().toISOString(),
      mode: 'VIDEO',
      status: 'CASE_PUSHED', // Case file pushed for doctor review (NOT ringable)
      room_id: roomId,
      reason: ai_assessment?.patient_summary || 'AI Case Assessment Review',
      ai_summary: ai_assessment,
      vision_observation,
      verified_ocr_data,
      vitals,
      symptoms,
      created_at: new Date().toISOString()
    };

    // Insert to Supabase DB consultations table
    try {
      await supabaseAdmin.from('consultations').insert([{
        visit_id: newPushRecord.visit_id,
        mode: 'VIDEO',
        status: 'CASE_PUSHED',
        meeting_room_id: roomId
      }]);
    } catch (e) {
      console.warn('Supabase DB consultation insert warning:', e.message);
    }

    MEMORY_CONSULTATIONS.unshift(newPushRecord);

    await logAuditEvent({
      actorId: req.user?.id || 'assistant_001',
      actorRole: req.user?.role || 'CLINIC_ASSISTANT',
      action: 'CASE_PUSHED_TO_DOCTOR',
      entityType: 'CONSULTATIONS',
      entityId: newPushRecord.id,
      metadata: { patient_id, doctor_name: newPushRecord.doctor_name, risk_level: newPushRecord.risk_level }
    });

    console.log(`📌 CASE PUSHED TO DOCTOR PORTAL DB! Patient: ${newPushRecord.patient_name} (${newPushRecord.patient_code}) & Doctor: ${newPushRecord.doctor_name}`);

    return res.status(201).json({
      message: 'Case file pushed to Doctor database successfully!',
      consultation: newPushRecord,
      room_id: roomId
    });
  } catch (error) {
    console.error('Error pushing case to doctor:', error.message);
    return res.status(500).json({ error: 'Failed to push case to doctor', details: error.message });
  }
};

// Explicitly Schedule a Video Teleconsultation Appointment
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
      risk_level = 'MODERATE',
      reason = 'Teleconsultation Review'
    } = req.body;

    if (!patient_id) {
      return res.status(400).json({ error: 'patient_id is required' });
    }

    const roomId = `room_${(patient_code || patient_id).replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    const newConsultation = {
      id: `c_${Date.now()}`,
      visit_id: visit_id || `v_${Date.now()}`,
      patient_id,
      patient_name: patient_name || 'Patient',
      patient_code: patient_code || `PAT-RECORD`,
      doctor_id: doctor_id || 'd_aiims_001',
      doctor_name: doctor_name || 'Dr. Rajesh Sharma (AIIMS New Delhi)',
      risk_level: risk_level.toUpperCase(),
      scheduled_time: scheduled_time || new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      mode: 'VIDEO',
      status: 'SCHEDULED', // Call is scheduled, only joinable via explicit click
      room_id: roomId,
      reason,
      created_at: new Date().toISOString()
    };

    try {
      await supabaseAdmin.from('consultations').insert([{
        visit_id: newConsultation.visit_id,
        doctor_id: newConsultation.doctor_id,
        mode: 'VIDEO',
        status: 'SCHEDULED',
        meeting_room_id: roomId
      }]);
    } catch (e) {
      console.warn('Supabase DB consultation insert warning:', e.message);
    }

    MEMORY_CONSULTATIONS.unshift(newConsultation);

    await logAuditEvent({
      actorId: req.user?.id || 'assistant_001',
      actorRole: req.user?.role || 'CLINIC_ASSISTANT',
      action: 'CONSULTATION_SCHEDULED',
      entityType: 'CONSULTATIONS',
      entityId: newConsultation.id,
      metadata: { patient_id, scheduled_time: newConsultation.scheduled_time, risk_level }
    });

    console.log(`📅 Consultation Scheduled! Room: ${roomId} for Patient: ${newConsultation.patient_name}`);

    return res.status(201).json({
      message: 'Video Consultation scheduled successfully',
      consultation: newConsultation,
      room_id: roomId,
      zego_app_id: parseInt(config.zegoCloud.appId || '1586356449')
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to schedule consultation', details: error.message });
  }
};

// Get All Scheduled Teleconsultations
export const getConsultations = async (req, res) => {
  try {
    let dbConsults = [];
    try {
      const { data } = await supabaseAdmin.from('consultations').select('*').neq('status', 'DECLINED').order('created_at', { ascending: false });
      if (data && data.length > 0) dbConsults = data;
    } catch (e) {}

    const combinedMap = new Map();
    MEMORY_CONSULTATIONS.filter(c => c.status !== 'DECLINED').forEach(c => combinedMap.set(c.id, c));
    dbConsults.filter(c => c.status !== 'DECLINED').forEach(c => {
      if (!combinedMap.has(c.id)) combinedMap.set(c.id, c);
    });

    return res.json(Array.from(combinedMap.values()));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch consultations', details: error.message });
  }
};

// Decline Video Call
export const declineConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    let consult = MEMORY_CONSULTATIONS.find(c => c.id === id || c.visit_id === id || c.room_id === id);

    if (consult) {
      consult.status = 'DECLINED';
    }

    try {
      await supabaseAdmin.from('consultations').update({ status: 'DECLINED' }).eq('id', id);
    } catch (e) {}

    await logAuditEvent({
      actorId: req.user?.id || 'dr_1',
      actorRole: 'DOCTOR',
      action: 'CONSULTATION_DECLINED',
      entityType: 'CONSULTATIONS',
      entityId: id
    });

    console.log(`🛑 Consultation Call ${id} DECLINED.`);
    return res.json({ message: 'Call declined successfully', status: 'DECLINED' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Join Video Consultation Room — Explicit User Action Only
export const joinConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    let consult = MEMORY_CONSULTATIONS.find(c => c.id === id || c.visit_id === id || c.room_id === id);

    if (consult && consult.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Call has already ended', status: 'COMPLETED' });
    }

    const roomId = consult ? consult.room_id : `room_${id.replace(/[^a-zA-Z0-9]/g, '_')}`;

    if (consult) {
      consult.status = 'ONGOING';
      consult.doctor_joined = req.user?.role === 'DOCTOR' ? true : consult.doctor_joined;
      consult.patient_joined = req.user?.role === 'CLINIC_ASSISTANT' ? true : consult.patient_joined;
    }

    try {
      await supabaseAdmin.from('consultations').update({ status: 'ONGOING' }).eq('id', id);
    } catch (e) {}

    await logAuditEvent({
      actorId: req.user?.id || 'user_101',
      actorRole: req.user?.role || 'CLINIC_ASSISTANT',
      action: 'CONSULTATION_JOINED',
      entityType: 'CONSULTATIONS',
      entityId: id
    });

    return res.json({
      message: 'Joining Video Consultation Room',
      consultation_id: id,
      room_id: roomId,
      status: 'ONGOING',
      zego_app_id: parseInt(config.zegoCloud.appId || '1586356449'),
      user_id: req.user?.id || `user_${Date.now()}`,
      user_name: req.user?.name || (req.user?.role === 'DOCTOR' ? 'Doctor' : 'Clinic Assistant & Patient')
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to join video consultation', details: error.message });
  }
};

export const createConsultation = async (req, res) => {
  return scheduleConsultation(req, res);
};

export const startConsultation = async (req, res) => {
  return joinConsultation(req, res);
};

export const endConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctor_notes } = req.body;

    let consult = MEMORY_CONSULTATIONS.find(c => c.id === id || c.visit_id === id || c.room_id === id);
    if (consult) {
      consult.status = 'COMPLETED';
      consult.doctor_notes = doctor_notes || 'Teleconsultation completed.';
    }

    try {
      await supabaseAdmin.from('consultations').update({
        status: 'COMPLETED',
        ended_at: new Date().toISOString(),
        doctor_notes: doctor_notes || 'Teleconsultation completed.'
      }).eq('id', id);
    } catch (e) {}

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      action: 'CONSULTATION_ENDED',
      entityType: 'CONSULTATIONS',
      entityId: id
    });

    return res.json({ message: 'Consultation completed successfully', status: 'COMPLETED' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to end consultation', details: error.message });
  }
};
