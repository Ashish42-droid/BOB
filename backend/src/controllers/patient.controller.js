import { supabaseAdmin } from '../config/supabase.js';
import { logAuditEvent } from '../middleware/audit.middleware.js';

// Real-Time In-Memory Fallback Cache
let MEMORY_PATIENTS = [];

// Helper to generate unique Patient Code
const generatePatientCode = () => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `PAT-2026-${randomNum}`;
};

export const createPatient = async (req, res) => {
  try {
    const {
      name,
      full_name,
      date_of_birth,
      age,
      age_years,
      gender = 'unknown',
      phone,
      village,
      district = 'Rampur',
      state = 'Uttar Pradesh',
      preferred_language = 'Hindi',
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact
    } = req.body;

    const patientName = full_name || name;
    if (!patientName || !village) {
      return res.status(400).json({ error: 'Patient full_name and village are required.' });
    }

    const patient_code = generatePatientCode();

    // Map gender enum safely to lowercase ('male', 'female', 'other', 'unknown')
    const safeGender = (gender || 'unknown').toLowerCase();
    const validGender = ['male', 'female', 'other', 'unknown'].includes(safeGender) ? safeGender : 'unknown';

    // Parse age safely (0 to 150)
    const parsedAge = age_years ? parseInt(age_years) : (age ? parseInt(age) : 35);
    if (parsedAge < 0 || parsedAge > 150) {
      return res.status(400).json({ error: 'Age must be between 0 and 150 years.' });
    }

    const patientRecord = {
      patient_code,
      full_name: patientName,
      date_of_birth: date_of_birth || null,
      age_years: parsedAge,
      gender: validGender,
      phone: phone || null,
      village,
      district,
      state,
      preferred_language,
      emergency_contact_name: emergency_contact_name || emergency_contact || null,
      emergency_contact_phone: emergency_contact_phone || null
    };

    const { data: newPatient, error: insertErr } = await supabaseAdmin
      .from('patients')
      .insert([patientRecord])
      .select()
      .single();

    if (insertErr || !newPatient) {
      console.error('patients insert FAILED:', insertErr?.message);
      return res.status(500).json({ error: 'Patient could not be saved to the database.', details: insertErr?.message });
    }

    newPatient.name = newPatient.full_name;
    newPatient.age = newPatient.age_years;
    MEMORY_PATIENTS.unshift(newPatient);
    console.log(`✅ Patient registered: ${newPatient.patient_code} (${newPatient.full_name})`);

    logAuditEvent({
      actorId: req.user?.id || 'assistant_001',
      actorRole: req.user?.role || 'CLINIC_ASSISTANT',
      action: 'PATIENT_CREATED',
      entityType: 'PATIENTS',
      entityId: newPatient.id,
      metadata: { patient_code, name: patientName, village }
    });

    return res.status(201).json(newPatient);
  } catch (error) {
    console.error('Error creating patient:', error.message);
    return res.status(500).json({ error: 'Failed to create patient record', details: error.message });
  }
};

export const getPatients = async (req, res) => {
  try {
    const { query, village, language } = req.query;

    let dbPatients = [];
    try {
      let dbQuery = supabaseAdmin.from('patients').select('*').order('created_at', { ascending: false });
      if (village) dbQuery = dbQuery.eq('village', village);
      if (language) dbQuery = dbQuery.eq('preferred_language', language);
      const { data } = await dbQuery;
      if (data && data.length > 0) dbPatients = data;
    } catch (e) {}

    // Combine DB patients with in-memory patients, removing duplicates
    const combinedMap = new Map();
    MEMORY_PATIENTS.forEach(p => combinedMap.set(p.id, p));
    dbPatients.forEach(p => {
      // Standardize name and age properties for UI compatibility
      p.name = p.full_name || p.name;
      p.age = p.age_years || p.age;
      combinedMap.set(p.id, p);
    });

    const result = Array.from(combinedMap.values());

    // Apply search filter if query is provided
    if (query) {
      const q = query.toLowerCase();
      return res.json(result.filter(p =>
        (p.full_name || p.name || '').toLowerCase().includes(q) ||
        (p.patient_code || '').toLowerCase().includes(q) ||
        (p.village || '').toLowerCase().includes(q)
      ));
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch patients', details: error.message });
  }
};

export const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    let patient = null;
    try {
      const { data } = await supabaseAdmin.from('patients').select('*').eq('id', id).single();
      if (data) {
        patient = data;
        patient.name = patient.full_name || patient.name;
        patient.age = patient.age_years || patient.age;
      }
    } catch (e) {}

    if (!patient) {
      patient = MEMORY_PATIENTS.find(p => p.id === id || p.patient_code === id);
    }

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    return res.json(patient);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch patient', details: error.message });
  }
};

export const getPatientHistory = async (req, res) => {
  try {
    const { id } = req.params;

    let visits = [];
    try {
      const { data } = await supabaseAdmin
        .from('visits')
        .select('*, visit_vitals(*), ai_assessments(*)')
        .eq('patient_id', id)
        .order('created_at', { ascending: false });
      if (data) visits = data;
    } catch (e) {}

    return res.json(visits || []);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch patient history', details: error.message });
  }
};
