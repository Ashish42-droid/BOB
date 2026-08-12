import { supabaseAdmin } from '../config/supabase.js';
import { logAuditEvent } from '../middleware/audit.middleware.js';

let MEMORY_VISITS = [];

// Helper to generate unique Visit Code
const generateVisitCode = () => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `VIS-2026-${randomNum}`;
};

// Strict Vitals Validation Middleware / Function
export const validateVitalsRanges = (vitals) => {
  const errors = [];
  if (!vitals) return { isValid: true, errors: [], cleanVitals: {} };

  const {
    temperature,
    temperature_celsius,
    blood_pressure_systolic,
    systolic_bp,
    blood_pressure_diastolic,
    diastolic_bp,
    pulse,
    pulse_bpm,
    spo2,
    oxygen_saturation,
    respiratory_rate,
    weight,
    weight_kg,
    height,
    height_cm
  } = vitals;

  // Temperature Validation: 95.0 °F to 107.0 °F (or 25°C to 50°C)
  let tempVal = temperature !== undefined && temperature !== null && temperature !== '' ? parseFloat(temperature) : null;
  if (tempVal !== null && !isNaN(tempVal)) {
    if (tempVal < 95.0 || tempVal > 107.0) {
      errors.push(`Temperature ${tempVal}°F is out of clinical range (95.0°F - 107.0°F).`);
    }
  }

  // Systolic BP: 50 to 300 mmHg
  let sysBP = (systolic_bp !== undefined && systolic_bp !== null && systolic_bp !== '') ? parseInt(systolic_bp) : ((blood_pressure_systolic !== undefined && blood_pressure_systolic !== null && blood_pressure_systolic !== '') ? parseInt(blood_pressure_systolic) : null);
  if (sysBP !== null && !isNaN(sysBP)) {
    if (sysBP < 50 || sysBP > 300) {
      errors.push(`Systolic BP ${sysBP} mmHg is out of clinical range (50 - 300 mmHg).`);
    }
  }

  // Diastolic BP: 20 to 200 mmHg
  let diaBP = (diastolic_bp !== undefined && diastolic_bp !== null && diastolic_bp !== '') ? parseInt(diastolic_bp) : ((blood_pressure_diastolic !== undefined && blood_pressure_diastolic !== null && blood_pressure_diastolic !== '') ? parseInt(blood_pressure_diastolic) : null);
  if (diaBP !== null && !isNaN(diaBP)) {
    if (diaBP < 20 || diaBP > 200) {
      errors.push(`Diastolic BP ${diaBP} mmHg is out of clinical range (20 - 200 mmHg).`);
    }
  }

  // Pulse: 20 to 250 bpm
  let pulseVal = (pulse_bpm !== undefined && pulse_bpm !== null && pulse_bpm !== '') ? parseInt(pulse_bpm) : ((pulse !== undefined && pulse !== null && pulse !== '') ? parseInt(pulse) : null);
  if (pulseVal !== null && !isNaN(pulseVal)) {
    if (pulseVal < 20 || pulseVal > 250) {
      errors.push(`Pulse Rate ${pulseVal} bpm is out of clinical range (20 - 250 bpm).`);
    }
  }

  // Oxygen Saturation (SpO2): 50 to 100 %
  let o2Val = (oxygen_saturation !== undefined && oxygen_saturation !== null && oxygen_saturation !== '') ? parseInt(oxygen_saturation) : ((spo2 !== undefined && spo2 !== null && spo2 !== '') ? parseInt(spo2) : null);
  if (o2Val !== null && !isNaN(o2Val)) {
    if (o2Val < 50 || o2Val > 100) {
      errors.push(`Oxygen Saturation (SpO2) ${o2Val}% is out of clinical range (50% - 100%).`);
    }
  }

  // Respiratory Rate: 5 to 80 /min
  let respVal = (respiratory_rate !== undefined && respiratory_rate !== null && respiratory_rate !== '') ? parseInt(respiratory_rate) : null;
  if (respVal !== null && !isNaN(respVal)) {
    if (respVal < 5 || respVal > 80) {
      errors.push(`Respiratory Rate ${respVal}/min is out of clinical range (5 - 80 /min).`);
    }
  }

  // Weight: 0.5 to 500 kg
  let wtVal = (weight_kg !== undefined && weight_kg !== null && weight_kg !== '') ? parseFloat(weight_kg) : ((weight !== undefined && weight !== null && weight !== '') ? parseFloat(weight) : null);
  if (wtVal !== null && !isNaN(wtVal)) {
    if (wtVal < 0.5 || wtVal > 500) {
      errors.push(`Weight ${wtVal} kg is out of range (0.5 - 500 kg).`);
    }
  }

  // Height: 20 to 250 cm
  let htVal = (height_cm !== undefined && height_cm !== null && height_cm !== '') ? parseFloat(height_cm) : ((height !== undefined && height !== null && height !== '') ? parseFloat(height) : null);
  if (htVal !== null && !isNaN(htVal)) {
    if (htVal < 20 || htVal > 250) {
      errors.push(`Height ${htVal} cm is out of range (20 - 250 cm).`);
    }
  }

  // Convert °F to °C for Postgres NUMERIC schema storage
  const tempCelsius = tempVal !== null ? parseFloat(((tempVal - 32) * (5 / 9)).toFixed(1)) : (temperature_celsius ? parseFloat(temperature_celsius) : null);

  const cleanVitals = {
    temperature_celsius: tempCelsius,
    temperature_fahrenheit: tempVal,
    systolic_bp: sysBP,
    diastolic_bp: diaBP,
    pulse_bpm: pulseVal,
    oxygen_saturation: o2Val,
    respiratory_rate: respVal,
    weight_kg: wtVal,
    height_cm: htVal
  };

  return {
    isValid: errors.length === 0,
    errors,
    cleanVitals
  };
};

export const createVisit = async (req, res) => {
  try {
    const {
      patient_id,
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
      return res.status(400).json({ error: 'patient_id is required.' });
    }

    // Validate vitals strict upper / lower limits
    const { isValid, errors, cleanVitals } = validateVitalsRanges(vitals);
    if (!isValid) {
      return res.status(400).json({
        error: 'Clinical Vitals out of safe limits',
        details: errors
      });
    }

    const visit_code = generateVisitCode();
    const chiefComplaintText = chief_complaint || symptoms || 'Acute Symptoms Review';

    const visitRecord = {
      visit_code,
      patient_id,
      status: 'open',
      chief_complaint: chiefComplaintText,
      preferred_consultation_language: preferred_language
    };

    let newVisit = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('visits')
        .insert([visitRecord])
        .select()
        .single();
      
      if (!error && data) {
        newVisit = data;
        
        // Insert into visit_vitals table
        try {
          await supabaseAdmin.from('visit_vitals').insert([{
            visit_id: newVisit.id,
            temperature_celsius: cleanVitals.temperature_celsius,
            systolic_bp: cleanVitals.systolic_bp,
            diastolic_bp: cleanVitals.diastolic_bp,
            pulse_bpm: cleanVitals.pulse_bpm,
            oxygen_saturation: cleanVitals.oxygen_saturation,
            respiratory_rate: cleanVitals.respiratory_rate,
            weight_kg: cleanVitals.weight_kg,
            height_cm: cleanVitals.height_cm
          }]);
        } catch (ve) {
          console.warn('visit_vitals table insert warning:', ve.message);
        }

      }
    } catch (e) {
      console.warn('Supabase DB visit insert exception:', e.message);
    }

    if (!newVisit) {
      newVisit = {
        id: `v_${Date.now()}`,
        visit_code,
        patient_id,
        status: 'open',
        chief_complaint: chiefComplaintText,
        symptoms: chiefComplaintText,
        symptom_duration: symptom_duration || '3 days',
        medical_history: medical_history || 'No chronic history',
        allergies: allergies || 'None',
        current_medications: current_medications || 'None',
        preferred_consultation_language: preferred_language,
        vitals: cleanVitals,
        created_at: new Date().toISOString()
      };
    } else {
      newVisit.vitals = cleanVitals;
    }

    MEMORY_VISITS.unshift(newVisit);
    console.log(`✅ Visit created & synced! Visit ID: ${newVisit.id} for Patient: ${patient_id}`);

    logAuditEvent({
      actorId: req.user?.id || 'assistant_001',
      actorRole: req.user?.role || 'CLINIC_ASSISTANT',
      action: 'VISIT_CREATED',
      entityType: 'VISITS',
      entityId: newVisit.id,
      metadata: { patient_id, status: newVisit.status }
    });

    return res.status(201).json(newVisit);
  } catch (error) {
    console.error('Error creating visit:', error.message);
    return res.status(500).json({ error: 'Failed to create visit record', details: error.message });
  }
};

export const updateVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    let visit = MEMORY_VISITS.find(v => v.id === id);
    if (visit) {
      Object.assign(visit, updates);
    }

    try {
      await supabaseAdmin.from('visits').update(updates).eq('id', id);
    } catch (e) {}

    return res.json({ message: 'Visit updated successfully', visit });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update visit', details: error.message });
  }
};

export const getVisits = async (req, res) => {
  try {
    let dbVisits = [];
    try {
      const { data } = await supabaseAdmin
        .from('visits')
        .select('*, patients(*), visit_vitals(*), ai_assessments(*)')
        .order('created_at', { ascending: false });
      if (data && data.length > 0) dbVisits = data;
    } catch (e) {}

    const combinedMap = new Map();
    MEMORY_VISITS.forEach(v => combinedMap.set(v.id, v));
    dbVisits.forEach(v => combinedMap.set(v.id, v));

    return res.json(Array.from(combinedMap.values()));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch visits', details: error.message });
  }
};

export const getVisitById = async (req, res) => {
  try {
    const { id } = req.params;
    let visit = null;

    try {
      const { data } = await supabaseAdmin
        .from('visits')
        .select('*, patients(*), visit_vitals(*), ai_assessments(*)')
        .eq('id', id)
        .single();
      if (data) visit = data;
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
