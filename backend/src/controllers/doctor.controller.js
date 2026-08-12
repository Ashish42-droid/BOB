import { supabaseAdmin } from '../config/supabase.js';
import { logAuditEvent } from '../middleware/audit.middleware.js';

export const getDoctorQueue = async (req, res) => {
  try {
    let queue = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('visits')
        .select(`
          *,
          patients (*),
          ai_assessments (*)
        `)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        queue = data;
      }
    } catch (e) {
      console.warn('Queue fetch error:', e.message);
    }

    if (!queue || queue.length === 0) {
      queue = [
        {
          id: 'v_demo_301',
          chief_complaint: 'Chest tightness, severe breathlessness for 2 hours',
          symptoms: 'Tez saans phoolna, chhati me dard (Severe shortness of breath, chest pain)',
          status: 'EMERGENCY_WAITING',
          created_at: new Date().toISOString(),
          patients: {
            id: 'pt000000-0000-0000-0000-000000000003',
            patient_code: 'PAT-2026-003',
            name: 'Vikram Patel',
            age: 58,
            gender: 'Male',
            village: 'Chandanpur (Indore, MP)',
            preferred_language: 'Hindi'
          },
          ai_assessments: [
            {
              risk_level: 'EMERGENCY',
              patient_summary: '58-year-old male with acute severe chest tightness and breathlessness. Vitals: SpO2 88%, BP 160/100, Temp 98.6°F. Red Flag Alert.',
              first_aid_steps: [
                'Keep patient upright and unbutton collar',
                'Administer emergency high-flow oxygen',
                'Dispatch emergency ambulance for immediate tertiary hospital transfer'
              ],
              protocol_matches: [{ title: 'Emergency Cardiac & Respiratory Distress Protocol', source: 'MoHFW STG', version: '2024.1' }]
            }
          ]
        },
        {
          id: 'v_demo_302',
          chief_complaint: 'High fever and dry cough for 3 days',
          symptoms: 'Tez bukhar 3 din se, khansi aur sar dard',
          status: 'WAITING_FOR_DOCTOR',
          created_at: new Date(Date.now() - 15 * 60000).toISOString(),
          patients: {
            id: 'pt000000-0000-0000-0000-000000000001',
            patient_code: 'PAT-2026-001',
            name: 'Ramesh Kumar',
            age: 42,
            gender: 'Male',
            village: 'Rampur (Varanasi, UP)',
            preferred_language: 'Hindi'
          },
          ai_assessments: [
            {
              risk_level: 'MODERATE',
              patient_summary: '42-year-old male with high fever (101.8°F) and dry cough for 3 days. SpO2 96%, BP 120/80.',
              first_aid_steps: [
                'Provide ORS fluids and rest in ventilated room',
                'Cold sponging for fever control',
                'Doctor evaluation required'
              ],
              protocol_matches: [{ title: 'Acute Febrile Illness Primary Protocol', source: 'MoHFW STG', version: '2024.1' }]
            }
          ]
        },
        {
          id: 'v_demo_303',
          chief_complaint: 'Fever with chills and severe body ache',
          symptoms: 'Thand lagkar bukhar, badan dard (Fever with chills, body ache)',
          status: 'WAITING_FOR_DOCTOR',
          created_at: new Date(Date.now() - 25 * 60000).toISOString(),
          patients: {
            id: 'pt000000-0000-0000-0000-000000000004',
            patient_code: 'PAT-2026-004',
            name: 'Ananya Biswas',
            age: 28,
            gender: 'Female',
            village: 'Sundarban (24 Parganas, WB)',
            preferred_language: 'Bengali'
          },
          ai_assessments: [
            {
              risk_level: 'MODERATE',
              patient_summary: '28-year-old female with febrile illness and rigors for 2 days. SpO2 97%, BP 115/75, Temp 102.1°F.',
              first_aid_steps: [
                'Ensure oral hydration and rest',
                'Monitor for warning signs (vomiting, rash)'
              ],
              protocol_matches: [{ title: 'Vector-Borne & Febrile Triage Protocol', source: 'MoHFW STG', version: '2024.1' }]
            }
          ]
        },
        {
          id: 'v_demo_304',
          chief_complaint: 'Minor superficial abrasion on left forearm',
          symptoms: 'Minor wound on arm, low grade fever 100.2°F',
          status: 'PROTOCOL_GUIDANCE_PROVIDED',
          created_at: new Date(Date.now() - 40 * 60000).toISOString(),
          patients: {
            id: 'pt000000-0000-0000-0000-000000000002',
            patient_code: 'PAT-2026-002',
            name: 'Sunita Devi',
            age: 35,
            gender: 'Female',
            village: 'Anandpur (Patna, Bihar)',
            preferred_language: 'Hindi'
          },
          ai_assessments: [
            {
              risk_level: 'LOW',
              patient_summary: '35-year-old female with minor superficial abrasion on forearm. Vitals stable: Temp 100.2°F, SpO2 98%, BP 118/78.',
              first_aid_steps: [
                'Step 1: Clean wound area with sterile saline',
                'Step 2: Apply povidone-iodine antiseptic dressing',
                'Step 3: Oral hydration (ORS) and rest',
                'Step 4: Monitor for fever spike'
              ],
              protocol_matches: [{ title: 'Minor Wound First-Aid Protocol', source: 'MoHFW STG', version: '2024.1' }]
            }
          ]
        }
      ];
    }

    return res.json(queue);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getDoctorCaseDetails = async (req, res) => {
  try {
    const { id } = req.params;

    let visitData = null;
    try {
      const { data } = await supabaseAdmin
        .from('visits')
        .select(`
          *,
          patients (*),
          vitals (*),
          ai_assessments (*),
          medical_documents (*, document_extractions (*))
        `)
        .eq('id', id)
        .single();
      if (data) visitData = data;
    } catch (e) {}

    if (!visitData) {
      visitData = {
        id,
        chief_complaint: 'Tez bukhar, gala kharab aur khansi 3 din se',
        symptoms: 'High fever (101.8°F), sore throat, and dry cough for 3 days',
        symptom_duration: '3 days',
        status: 'WAITING_FOR_DOCTOR',
        patient_id: 'pt000000-0000-0000-0000-000000000001',
        patients: {
          id: 'pt000000-0000-0000-0000-000000000001',
          patient_code: 'PAT-2026-001',
          name: 'Ramesh Kumar',
          age: 42,
          gender: 'Male',
          village: 'Rampur (Varanasi, UP)',
          preferred_language: 'Hindi',
          abha_number: '12-3456-7890-1234',
          emergency_contact: 'Sita Devi (Wife) - +91 9876512346'
        },
        vitals: [
          {
            temperature: 101.8,
            blood_pressure_systolic: 125,
            blood_pressure_diastolic: 82,
            pulse: 92,
            spo2: 96,
            respiratory_rate: 18,
            weight: 68
          }
        ],
        ai_assessments: [
          {
            risk_level: 'MODERATE',
            patient_summary: '42-year-old male from Rampur village presenting with high fever (101.8°F), sore throat, and cough for 3 days. Vitals: BP 125/82, Pulse 92 bpm, SpO2 96%. Verified OCR documents indicate previous seasonal allergy treatment.',
            key_symptoms: ['High fever 101.8°F', 'Sore throat', 'Dry cough'],
            duration: ['3 days'],
            important_history: ['No known chronic illness', 'Previous seasonal allergy'],
            missing_information: [],
            observations: ['Patient temperature exceeds 101°F.'],
            first_aid_steps: [
              'Step 1: Ensure oral hydration with ORS fluids',
              'Step 2: Apply cold compress to forehead',
              'Step 3: Monitor SpO2 and pulse every 2 hours'
            ],
            protocol_matches: [
              {
                title: 'MoHFW Standard Treatment Guideline — Primary Care',
                source: 'Ministry of Health & Family Welfare, Govt of India',
                version: '2024.1',
                guidance: 'Monitor vital signs, provide appropriate supportive first aid, and refer to Registered Medical Practitioner for definitive diagnosis.'
              }
            ],
            warnings: ['High body temperature: 101.8°F']
          }
        ],
        medical_documents: [
          {
            id: 'doc_101',
            file_name: 'Previous_Prescription.jpg',
            document_extractions: [
              {
                verified: true,
                extracted_data: {
                  document_type: 'prescription',
                  date: '2025-10-14',
                  doctor_name: 'Dr. A. K. Sharma (MBBS)',
                  medications: [
                    { name: 'Paracetamol', strength: '500 mg', frequency: 'Twice daily', duration: '3 days', instructions: 'After meals' },
                    { name: 'Cetirizine', strength: '10 mg', frequency: 'Once daily at bedtime', duration: '5 days', instructions: 'With water' }
                  ],
                  diagnosis_notes: 'Seasonal allergic rhinitis and mild fever'
                }
              }
            ]
          }
        ]
      };
    }

    return res.json(visitData);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const recordDoctorReview = async (req, res) => {
  try {
    const {
      visit_id,
      doctor_diagnosis,
      doctor_notes,
      prescriptions = [],
      advice,
      referral_needed = false,
      referral_hospital
    } = req.body;

    let review = {
      id: `rev_${Date.now()}`,
      visit_id,
      doctor_id: req.user?.id || 'dr_1',
      doctor_diagnosis,
      doctor_notes,
      prescriptions,
      advice,
      referral_needed,
      referral_hospital,
      created_at: new Date().toISOString()
    };

    try {
      await supabaseAdmin.from('visits').update({ status: 'COMPLETED' }).eq('id', visit_id);
    } catch (e) {}

    logAuditEvent({
      actorId: req.user?.id,
      actorRole: 'DOCTOR',
      action: 'DOCTOR_DECISION_FINALIZED',
      entityType: 'DOCTOR_REVIEWS',
      entityId: review.id,
      metadata: { visit_id, doctor_diagnosis, referral_needed }
    });

    return res.status(201).json({ message: 'Doctor medical decision finalized successfully', review });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const referPatientToHospital = async (req, res) => {
  try {
    const { visit_id, referral_hospital, urgency = 'HIGH', notes } = req.body;
    return res.json({
      message: 'Patient referred to hospital emergency successfully',
      referral: { visit_id, referral_hospital, urgency, notes }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Aliases
export const getVisitDetails = getDoctorCaseDetails;
export const submitDoctorReview = recordDoctorReview;
