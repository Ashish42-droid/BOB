/**
 * Clinical Risk Engine & Protocol Safety Classifier
 *
 * Categorizes every case as LOW, MEDIUM, or HIGH.
 * HIGH cases with life-threatening red flags additionally carry
 * immediateReferral: true (ambulance / district-hospital escalation).
 * This rule engine always overrides the LLM's own risk output.
 */
export const calculateRiskLevel = (vitals = {}, symptoms = '', history = '') => {
  const warnings = [];
  let riskLevel = 'LOW';
  let immediateReferral = false;

  const temp = parseFloat(vitals.temperature ?? vitals.temperature_fahrenheit);
  const spo2 = parseInt(vitals.spo2 ?? vitals.oxygen_saturation);
  const sysBP = parseInt(vitals.blood_pressure_systolic ?? vitals.systolic_bp);
  const pulse = parseInt(vitals.pulse ?? vitals.pulse_bpm);
  const respRate = parseInt(vitals.respiratory_rate);

  const symLower = (symptoms || '').toLowerCase();
  const histLower = (history || '').toLowerCase();

  // ---- HIGH RISK: life-threatening red flags (immediate referral) ----
  if (spo2 && spo2 < 90) {
    riskLevel = 'HIGH';
    immediateReferral = true;
    warnings.push('CRITICAL: Oxygen saturation (SpO2) below 90% indicates severe hypoxemia.');
  }
  if (sysBP && sysBP < 90) {
    riskLevel = 'HIGH';
    immediateReferral = true;
    warnings.push('CRITICAL: Systolic blood pressure below 90 mmHg indicates possible shock.');
  } else if (sysBP && sysBP >= 180) {
    riskLevel = 'HIGH';
    immediateReferral = true;
    warnings.push('CRITICAL: Systolic blood pressure 180 mmHg or above indicates hypertensive crisis.');
  }
  const redFlagSymptoms = ['chest pain', 'unconscious', 'severe shortness of breath', 'heavy bleeding', 'seizure', 'stiff neck', 'altered sensorium'];
  const matchedRedFlags = redFlagSymptoms.filter((s) => symLower.includes(s));
  if (matchedRedFlags.length > 0) {
    riskLevel = 'HIGH';
    immediateReferral = true;
    warnings.push(`CRITICAL: Red-flag symptom reported (${matchedRedFlags.join(', ')}).`);
  }

  if (immediateReferral) {
    return {
      riskLevel: 'HIGH',
      riskReasoning: 'Life-threatening red flags detected. Stop protocol care, alert the doctor immediately, and arrange emergency hospital referral.',
      warnings,
      requiresDoctor: true,
      immediateReferral: true
    };
  }

  // ---- HIGH RISK: serious but not immediately life-threatening ----
  if (spo2 && spo2 >= 90 && spo2 < 94) {
    riskLevel = 'HIGH';
    warnings.push(`Oxygen saturation is low (${spo2}%). Doctor review required urgently.`);
  }
  if (respRate && (respRate > 30 || respRate < 8)) {
    riskLevel = 'HIGH';
    warnings.push(`Abnormal respiratory rate recorded: ${respRate}/min.`);
  }
  if (temp && temp >= 103.5) {
    riskLevel = 'HIGH';
    warnings.push(`Very high body temperature recorded: ${temp}°F.`);
  }

  if (riskLevel === 'HIGH') {
    return {
      riskLevel: 'HIGH',
      riskReasoning: `Serious warning indicators present — urgent doctor evaluation required. ${warnings.join(' ')}`,
      warnings,
      requiresDoctor: true,
      immediateReferral: false
    };
  }

  // ---- MEDIUM RISK ----
  if (temp && temp > 101.5) {
    riskLevel = 'MEDIUM';
    warnings.push(`High body temperature recorded: ${temp}°F.`);
  }
  if (pulse && (pulse > 110 || pulse < 50)) {
    riskLevel = 'MEDIUM';
    warnings.push(`Abnormal pulse rate recorded: ${pulse} bpm.`);
  }
  if (symLower.includes('fever') && (symLower.includes('cough') || symLower.includes('vomiting'))) {
    riskLevel = 'MEDIUM';
    warnings.push('Multiple concurrent symptoms (fever with respiratory or gastrointestinal involvement).');
  }
  if (histLower.includes('diabetes') || histLower.includes('hypertension') || histLower.includes('heart') || histLower.includes('copd') || histLower.includes('asthma')) {
    if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
    warnings.push('Chronic comorbidity in history raises baseline risk — doctor review advised.');
  }

  if (riskLevel === 'MEDIUM') {
    return {
      riskLevel: 'MEDIUM',
      riskReasoning: `Case requires professional doctor evaluation. Warning indicators: ${warnings.join(' ')}`,
      warnings,
      requiresDoctor: true,
      immediateReferral: false
    };
  }

  // ---- LOW RISK ----
  return {
    riskLevel: 'LOW',
    riskReasoning: 'Vitals within standard physiological ranges. Eligible for approved first-aid protocol guidance; doctor consultation available on request.',
    warnings: warnings.length ? warnings : ['Monitor the patient for any developing red-flag symptoms.'],
    requiresDoctor: false,
    immediateReferral: false
  };
};
