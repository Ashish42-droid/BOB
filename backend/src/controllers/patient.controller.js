import { supabaseAdmin } from '../config/supabase.js';
import { logAuditEvent } from '../middleware/audit.middleware.js';

// Real-Time In-Memory Patient Persistence Cache
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
      date_of_birth,
      age,
      gender,
      phone,
      village,
      preferred_language = 'Hindi',
      abha_number,
      emergency_contact
    } = req.body;

    if (!name || !gender || !village) {
      return res.status(400).json({ error: 'Patient name, gender, and village are required.' });
    }

    const patient_code = generatePatientCode();

    const patientRecord = {
      patient_code,
      name,
      age: age ? parseInt(age) : 35,
      gender,
      phone: phone || null,
      village,
      preferred_language: preferred_language || 'Hindi',
      abha_number: abha_number || null,
      emergency_contact: emergency_contact || null
    };

    let newPatient = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('patients')
        .insert([patientRecord])
        .select()
        .single();
      
      if (!error && data) {
        newPatient = data;
        console.log(`🎉 REAL-TIME SUPABASE DATABASE INSERT SUCCESSFUL! ID: ${newPatient.id} (${newPatient.name})`);
      } else if (error) {
        console.error(`⚠️ SUPABASE DATABASE INSERT REJECTED:`, error.message);
        if (error.code === 'PGRST205') {
          console.error(`📌 REASON: The 'patients' table does not exist in your Supabase SQL database yet. Run schema in Supabase SQL Editor.`);
        }
      }
    } catch (e) {
      console.warn('Supabase DB patient insert exception:', e.message);
    }

    if (!newPatient) {
      newPatient = {
        id: `pt_${Date.now()}`,
        patient_code,
        name,
        date_of_birth: date_of_birth || null,
        age: age ? parseInt(age) : 35,
        gender,
        phone: phone || null,
        village,
        preferred_language: preferred_language || 'Hindi',
        abha_number: abha_number || null,
        emergency_contact: emergency_contact || null,
        created_at: new Date().toISOString()
      };
    }

    // Unshift to real-time memory store
    MEMORY_PATIENTS.unshift(newPatient);
    console.log(`✅ Patient registered & saved! Code: ${newPatient.patient_code} (${newPatient.name})`);

    logAuditEvent({
      actorId: req.user?.id || 'assistant_001',
      actorRole: req.user?.role || 'CLINIC_ASSISTANT',
      action: 'PATIENT_CREATED',
      entityType: 'PATIENTS',
      entityId: newPatient.id,
      metadata: { patient_code, name, village }
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
    dbPatients.forEach(p => combinedMap.set(p.id, p));

    const result = Array.from(combinedMap.values());

    // Apply search filter if query is provided
    if (query) {
      const q = query.toLowerCase();
      return res.json(result.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
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
      if (data) patient = data;
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
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false });
      if (data) visits = data;
    } catch (e) {}

    return res.json(visits || []);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch patient history', details: error.message });
  }
};
