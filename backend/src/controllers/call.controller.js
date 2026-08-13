import { supabaseAdmin } from '../config/supabase.js';

/**
 * Availability-aware teleconsultation scheduling.
 * Persists to the live `appointments` table (the `calls` table referenced by
 * older builds does not exist in the database).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuid = (v) => (typeof v === 'string' && UUID_RE.test(v) ? v : null);

const WORKING_HOURS = { start: 8, end: 20 }; // 08:00 - 20:00 IST clinic hours
const SLOT_MINUTES = 15;

// scheduled_time has no dedicated column; it is encoded in appointments.reason.
const SCHEDULE_TAG = 'Scheduled for: ';
const extractScheduledTime = (reason) => {
  const idx = (reason || '').indexOf(SCHEDULE_TAG);
  return idx >= 0 ? reason.slice(idx + SCHEDULE_TAG.length).trim() : null;
};

const doctorRowToInfo = (data) =>
  data
    ? {
        id: data.staff_id,
        name: data.staff_profiles?.full_name || 'Doctor',
        specialization: data.specialization,
        qualification: data.qualification
      }
    : null;

async function getDoctorById(doctorId) {
  if (!asUuid(doctorId)) return null;
  const { data } = await supabaseAdmin
    .from('doctor_profiles')
    .select('staff_id, specialization, qualification, staff_profiles(full_name, email)')
    .eq('staff_id', doctorId)
    .maybeSingle();
  return doctorRowToInfo(data);
}

async function getDefaultDoctor() {
  const { data } = await supabaseAdmin
    .from('doctor_profiles')
    .select('staff_id, specialization, qualification, staff_profiles(full_name, email)')
    .limit(1)
    .maybeSingle();
  return doctorRowToInfo(data);
}

/**
 * GET /api/calls/availability — working hours for every active doctor, so the
 * assistant can compare doctors before picking a slot.
 */
export const getDoctorAvailability = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('doctor_profiles')
      .select('staff_id, specialization, qualification, staff_profiles!inner(full_name, status)')
      .eq('staff_profiles.status', 'active')
      .order('specialization', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to load doctor availability', details: error.message });
    }

    return res.json((data || []).map((d) => ({
      doctor_id: d.staff_id,
      doctor_name: d.staff_profiles?.full_name || 'Doctor',
      specialization: d.specialization || 'General Medicine',
      qualification: d.qualification || '',
      working_days: 'Monday - Saturday',
      start_time: '08:00',
      end_time: '20:00',
      is_active: true
    })));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load doctor availability', details: error.message });
  }
};

export const scheduleCall = async (req, res) => {
  try {
    const {
      visit_id,
      patient_id,
      doctor_id,
      patient_name,
      patient_code,
      scheduled_time,
      risk_level = 'MEDIUM',
      reason = 'Follow-up teleconsultation'
    } = req.body;

    if (!scheduled_time) {
      return res.status(400).json({ error: 'scheduled_time is required' });
    }
    if (!asUuid(patient_id) || !asUuid(visit_id)) {
      return res.status(400).json({ error: 'Valid patient_id and visit_id are required to book an appointment.' });
    }

    const targetDate = new Date(scheduled_time);
    if (Number.isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'scheduled_time is not a valid date/time.' });
    }
    if (targetDate.getTime() < Date.now() - 60 * 1000) {
      return res.status(400).json({ error: 'The selected time is in the past. Choose an upcoming slot.' });
    }

    const hour = targetDate.getHours();
    if (hour < WORKING_HOURS.start || hour >= WORKING_HOURS.end) {
      return res.status(400).json({
        error: `The doctor is available between ${String(WORKING_HOURS.start).padStart(2, '0')}:00 and ${WORKING_HOURS.end}:00. Choose a time in that window.`
      });
    }

    // Resolve the doctor selected by the assistant (falls back to first doctor
    // only when no doctor_id was provided at all).
    const doctor = (await getDoctorById(doctor_id)) || (await getDefaultDoctor());
    if (asUuid(doctor_id) && (!doctor || doctor.id !== doctor_id)) {
      return res.status(404).json({ error: 'The selected doctor was not found. Refresh the doctor list and pick again.' });
    }
    const doctorId = doctor?.id;
    if (!doctorId) {
      return res.status(503).json({ error: 'No doctor profile is registered yet. Run the setup script or register a doctor account first.' });
    }

    // 15-minute slot collision check — scoped to THIS doctor only, so the
    // assistant can book several doctors at the same time in parallel.
    const { data: existing } = await supabaseAdmin
      .from('appointments')
      .select('id, reason, status')
      .eq('doctor_id', doctorId)
      .in('status', ['scheduled', 'confirmed', 'in_progress']);

    const requestedMs = targetDate.getTime();
    const collision = (existing || []).some((a) => {
      const t = extractScheduledTime(a.reason);
      if (!t) return false;
      const ms = new Date(t).getTime();
      return !Number.isNaN(ms) && Math.abs(ms - requestedMs) < SLOT_MINUTES * 60 * 1000;
    });
    if (collision) {
      return res.status(409).json({
        error: `${doctor.name} already has a consultation within ${SLOT_MINUTES} minutes of that time. Choose a different slot or a different doctor.`
      });
    }

    const riskEnum = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' }[String(risk_level).toUpperCase()] || 'medium';
    const roomId = `room_${(patient_code || 'PAT').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;

    const { data: appointment, error: aptErr } = await supabaseAdmin
      .from('appointments')
      .insert([{
        appointment_code: `APT-${Date.now()}`,
        patient_id,
        visit_id,
        doctor_id: doctorId,
        risk_level: riskEnum,
        status: 'scheduled',
        reason: `${reason} | ${SCHEDULE_TAG}${targetDate.toISOString()}`,
        booked_by: asUuid(req.user?.id)
      }])
      .select()
      .single();

    if (aptErr) {
      console.error('appointments insert FAILED:', aptErr.message);
      return res.status(500).json({ error: 'Appointment could not be saved.', details: aptErr.message });
    }

    // Waiting video room tied to this appointment
    const { data: consultation, error: conErr } = await supabaseAdmin
      .from('consultations')
      .insert([{
        appointment_id: appointment.id,
        visit_id,
        consultation_type: 'video',
        status: 'waiting',
        meeting_room_id: roomId
      }])
      .select()
      .single();
    if (conErr) console.warn('consultations insert failed:', conErr.message);

    await supabaseAdmin.from('visits').update({ status: 'consultation_scheduled' }).eq('id', visit_id);

    return res.status(201).json({
      ...appointment,
      scheduled_time: targetDate.toISOString(),
      room_id: roomId,
      consultation_id: consultation?.id || null,
      doctor_id: doctorId,
      doctor_name: doctor?.name,
      doctor_specialization: doctor?.specialization,
      patient_name: patient_name || 'Patient'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Call scheduling failed', details: error.message });
  }
};

export const listCalls = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('*, patients(full_name, patient_code), consultations(id, status, meeting_room_id), doctor_profiles(specialization, staff_profiles(full_name))')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('appointments fetch failed:', error.message);
      return res.json([]);
    }

    return res.json((data || []).map((a) => ({
      ...a,
      scheduled_time: extractScheduledTime(a.reason) || a.created_at,
      patient_name: a.patients?.full_name || 'Patient',
      patient_code: a.patients?.patient_code || '',
      doctor_name: a.doctor_profiles?.staff_profiles?.full_name || 'Doctor',
      doctor_specialization: a.doctor_profiles?.specialization || '',
      room_id: a.consultations?.[0]?.meeting_room_id || null
    })));
  } catch (error) {
    return res.json([]);
  }
};

export const updateCallStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
    const clean = String(status || '').toLowerCase();
    if (!allowed.includes(clean)) {
      return res.status(400).json({ error: `Invalid status '${status}'. Allowed: ${allowed.join(', ')}` });
    }

    const { error } = await supabaseAdmin.from('appointments').update({ status: clean }).eq('id', asUuid(id));
    if (error) {
      return res.status(500).json({ error: 'Failed to update appointment status', details: error.message });
    }

    return res.json({ success: true, id, status: clean });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update call status' });
  }
};
