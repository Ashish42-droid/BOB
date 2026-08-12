/**
 * Clinical Risk Engine & Protocol Safety Classifier
 */
export const calculateRiskLevel = (vitals = {}, symptoms = '', history = '') => {
  const warnings = [];
  let riskLevel = 'LOW';
  let riskReasoning = 'Patient exhibits normal vital signs and low-risk symptom presentation.';

  const temp = parseFloat(vitals.temperature);
  const spo2 = parseInt(vitals.spo2);
  const sysBP = parseInt(vitals.blood_pressure_systolic);
  const diaBP = parseInt(vitals.blood_pressure_diastolic);
  const pulse = parseInt(vitals.pulse);
  const respRate = parseInt(vitals.respiratory_rate);

  const symLower = (symptoms || '').toLowerCase();
  const histLower = (history || '').toLowerCase();

  // 1. EMERGENCY RED TRIGGER CHECKS
  if (spo2 && spo2 < 90) {
    riskLevel = 'EMERGENCY';
    warnings.push('CRITICAL: Oxygen Saturation (SpO2) < 90% indicates severe hypoxemia.');
  }

  if (sysBP && sysBP < 90) {
    riskLevel = 'EMERGENCY';
    warnings.push('CRITICAL: Systolic Blood Pressure < 90 mmHg indicates severe hypotension/shock.');
  } else if (sysBP && sysBP >= 180) {
    riskLevel = 'EMERGENCY';
    warnings.push('CRITICAL: Systolic Blood Pressure >= 180 mmHg indicates Hypertensive Crisis.');
  }

  if (symLower.includes('chest pain') || symLower.includes('unconscious') || symLower.includes('severe shortness of breath') || symLower.includes('heavy bleeding')) {
    riskLevel = 'EMERGENCY';
    warnings.push('CRITICAL EMERGENCY RED ALERT: High-risk red flag symptom detected (Chest pain / Breathing difficulty / Severe hemorrhage).');
  }

  if (riskLevel === 'EMERGENCY') {
    riskReasoning = 'CRITICAL EMERGENCY DETECTED. Immediate escalation to Doctor and District Hospital Referral required. Stop automated protocols.';
    return { riskLevel: 'EMERGENCY', riskReasoning, warnings, requiresDoctor: true, immediateReferral: true };
  }

  // 2. MODERATE / HIGH YELLOW TRIGGER CHECKS
  if (spo2 && spo2 >= 90 && spo2 < 94) {
    riskLevel = 'HIGH';
    warnings.push('Oxygen Saturation (SpO2) is low (90-93%).');
  }

  if (temp && temp > 101.5) {
    if (riskLevel === 'LOW') riskLevel = 'MODERATE';
    warnings.push(`High body temperature recorded: ${temp}°F.`);
  }

  if (pulse && (pulse > 110 || pulse < 50)) {
    if (riskLevel === 'LOW') riskLevel = 'MODERATE';
    warnings.push(`Abnormal pulse rate recorded: ${pulse} bpm.`);
  }

  if (symLower.includes('fever') && (symLower.includes('cough') || symLower.includes('vomiting'))) {
    if (riskLevel === 'LOW') riskLevel = 'MODERATE';
    warnings.push('Multiple concurrent symptoms (Fever + Respiratory/GI involvement).');
  }

  if (riskLevel === 'HIGH' || riskLevel === 'MODERATE') {
    riskReasoning = `Case requires professional doctor evaluation. Warning indicators present: ${warnings.join(' ')}`;
    return { riskLevel, riskReasoning, warnings, requiresDoctor: true, immediateReferral: false };
  }

  // 3. LOW RISK PROTOCOL-ELIGIBLE
  return {
    riskLevel: 'LOW',
    riskReasoning: 'Vitals within standard physiological ranges. Symptoms eligible for approved first-aid protocol guidance and doctor consultation if requested.',
    warnings: warnings.length ? warnings : ['Monitor patient for any developing red-flag symptoms.'],
    requiresDoctor: false,
    immediateReferral: false
  };
};
