import { config } from '../config/env.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logAuditEvent } from '../middleware/audit.middleware.js';

// In-Memory Persistence Store for Scheduled Video Teleconsultations
let MEMORY_CONSULTATIONS = [
  {
    id: 'c_mod_101',
    visit_id: 'v_priyam_101',
    patient_id: 'pt_1786539731512',
    patient_name: 'Priyam Mishra',
    patient_code: 'PAT-2026-3016',
    doctor_id: 'd_aiims_001',
    doctor_name: 'Dr. Rajesh Sharma (AIIMS New Delhi)',
    risk_level: 'MODERATE',
    scheduled_time: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 mins from now
    mode: 'VIDEO',
    status: 'SCHEDULED',
    room_id: 'room_priyam_3016',
    reason: 'Moderate Fever & Dry Cough Protocol Review'
  },
  {
    id: 'c_reg_102',
    visit_id: 'v_reg_202',
    patient_id: 'pt_reg_505',
    patient_name: 'Ramesh Kumar',
    patient_code: 'PAT-2026-1044',
    doctor_id: 'd_jipmer_002',
    doctor_name: 'Dr. Ananya Sen (JIPMER Puducherry)',
    risk_level: 'LOW',
    scheduled_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 mins from now
    mode: 'VIDEO',
    status: 'SCHEDULED',
    room_id: 'room_ramesh_1044',
    reason: 'Regular Follow-up Routine Hypertension Consultation'
  },
  {
    id: 'c_high_103',
    visit_id: 'v_high_303',
    patient_id: 'pt_high_808',
    patient_name: 'Sunita Devi',
    patient_code: 'PAT-2026-9021',
    doctor_id: 'd_pgimer_003',
    doctor_name: 'Dr. Vikramaditya Rao (PGIMER Chandigarh)',
    risk_level: 'HIGH',
    scheduled_time: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 mins from now
    mode: 'VIDEO',
    status: 'WAITING',
    room_id: 'room_sunita_9021',
    reason: 'High Risk Severe Respiratory Distress Escalation'
  }
];

// Schedule a Video Teleconsultation Appointment
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
      patient_code: patient_code || `PAT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      doctor_id: doctor_id || 'd_aiims_001',
      doctor_name: doctor_name || 'Dr. Rajesh Sharma (AIIMS New Delhi)',
      risk_level: risk_level.toUpperCase(),
      scheduled_time: scheduled_time || new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      mode: 'VIDEO',
      status: 'SCHEDULED',
      room_id: roomId,
      reason,
      created_at: new Date().toISOString()
    };

    // Try DB Insert
    try {
      await supabaseAdmin.from('consultations').insert([{
        visit_id: newConsultation.visit_id,
        doctor_id: newConsultation.doctor_id,
        mode: 'VIDEO',
        status: 'SCHEDULED'
      }]);
    } catch (e) {
      console.warn('Supabase DB consultation insert fallback to memory store');
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

    console.log(`✅ Consultation Scheduled! Room: ${roomId} for Patient: ${newConsultation.patient_name}`);

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
      const { data } = await supabaseAdmin.from('consultations').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) dbConsults = data;
    } catch (e) {}

    // Combine in-memory + db consults
    const combinedMap = new Map();
    MEMORY_CONSULTATIONS.forEach(c => combinedMap.set(c.id, c));
    dbConsults.forEach(c => {
      if (!combinedMap.has(c.id)) combinedMap.set(c.id, c);
    });

    return res.json(Array.from(combinedMap.values()));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch consultations', details: error.message });
  }
};

// Join Video Consultation Room
export const joinConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    let consult = MEMORY_CONSULTATIONS.find(c => c.id === id || c.visit_id === id || c.room_id === id);

    const roomId = consult ? consult.room_id : `room_${id.replace(/[^a-zA-Z0-9]/g, '_')}`;

    if (consult) {
      consult.status = 'IN_PROGRESS';
    }

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

    return res.json({ message: 'Consultation completed successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to end consultation', details: error.message });
  }
};
