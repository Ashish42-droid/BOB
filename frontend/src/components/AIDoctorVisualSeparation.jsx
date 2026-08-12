import React from 'react';
import { Bot, Stethoscope, AlertTriangle, BookOpen, ShieldCheck, FileCheck2, UserCheck, Camera, FileText, Pill } from 'lucide-react';
import RiskBadge from './RiskBadge';

export default function AIDoctorVisualSeparation({ aiAssessment, doctorReview, prescription, documents = [], images = [] }) {
  return (
    <div className="space-y-6">
      
      {/* 🤖 1. AI ASSISTANCE & CLINICAL ARTIFACTS SECTION */}
      <div className="rounded-2xl bg-cyan-950/20 border-2 border-cyan-500/40 p-5 shadow-xl relative overflow-hidden space-y-5">
        <div className="absolute top-0 right-0 bg-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl border-l border-b border-cyan-500/30">
          PRELIMINARY AI PREPARATION & DATA
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shrink-0">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-cyan-300 flex items-center gap-2">
              🤖 AI LLM SUMMARY & CLINICAL ARTIFACTS
            </h3>
            <p className="text-xs text-slate-400">Database-backed AI synthesis, OCR prescription extractions, and vision photo observations.</p>
          </div>
        </div>

        {aiAssessment ? (
          <div className="space-y-4 text-xs text-slate-200">
            
            {/* Risk Status */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="font-semibold text-slate-300">Rule Engine Risk Status:</span>
              <RiskBadge level={aiAssessment.risk_level} />
            </div>

            {/* AI Summary */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-cyan-400" /> Patient Assessment Summary
              </div>
              <p className="leading-relaxed text-slate-200 font-medium">
                {aiAssessment.patient_summary || aiAssessment.summary || 'Patient Assessment Summary Logged'}
              </p>
            </div>

            {/* Step-by-Step First Aid Guidance */}
            {aiAssessment.first_aid_steps && aiAssessment.first_aid_steps.length > 0 && (
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Step-by-Step First-Aid Guidance
                </div>
                <div className="space-y-1.5 text-slate-300">
                  {aiAssessment.first_aid_steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">{idx+1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supportive Protocol Medication Guidance (AI Prescription) */}
            {aiAssessment.supportive_medication_guidance && aiAssessment.supportive_medication_guidance.length > 0 && (
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-2">
                <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-cyan-400" /> Protocol Supportive Care & Allowed OTC Medication Guidance
                </div>
                <div className="space-y-1 text-slate-300">
                  {aiAssessment.supportive_medication_guidance.map((med, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                      • {med}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scanned Document OCR Data */}
            {documents && documents.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" /> Scanned Document (OCR) Records ({documents.length})
                </div>
                {documents.map((doc, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                    <div className="font-semibold text-white">{doc.original_file_name || doc.file_name} ({doc.document_type})</div>
                    {doc.document_extractions?.[0]?.structured_data && (
                      <div className="text-slate-300">
                        Extracted: {JSON.stringify(doc.document_extractions[0].structured_data.medications || doc.document_extractions[0].structured_data)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Injury Photo Observations */}
            {images && images.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="font-bold text-purple-300 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-purple-400" /> Injury & Clinical Photo Observations ({images.length})
                </div>
                {images.map((img, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px]">
                    <div className="font-semibold text-purple-200">Image Type: {img.image_type || 'INJURY'}</div>
                    <div className="text-slate-300 mt-0.5">Summary: Visible skin observation logged for doctor inspection.</div>
                  </div>
                ))}
              </div>
            )}

            {/* Warning Flags */}
            {aiAssessment.warnings && aiAssessment.warnings.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Warning Flags & Safety Checks
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {aiAssessment.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Protocol References */}
            {aiAssessment.protocol_matches && aiAssessment.protocol_matches.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="font-bold text-cyan-400 flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" /> Approved MoHFW Clinical Protocols
                </div>
                <div className="space-y-2">
                  {aiAssessment.protocol_matches.map((p, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="font-semibold text-slate-200">{p.title} ({p.source || 'MoHFW'})</div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-normal">{p.guidance || p.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="text-xs text-slate-400 italic p-4 border border-dashed border-slate-800 rounded-xl text-center">
            No AI assessment generated for this visit yet.
          </div>
        )}
      </div>

      {/* 👨‍⚕️ 2. DOCTOR DECISION SECTION */}
      <div className="rounded-2xl bg-emerald-950/20 border-2 border-emerald-500/50 p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl border-l border-b border-emerald-500/30">
          BINDING MEDICAL CLINICAL DECISION
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-emerald-300 flex items-center gap-2">
              👨‍⚕️ QUALIFIED DOCTOR MEDICAL DECISION
            </h3>
            <p className="text-xs text-slate-400">Final clinical diagnosis, prescription issuance, and treatment decisions by Registered Medical Practitioner.</p>
          </div>
        </div>

        {doctorReview ? (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400">Doctor Decision:</span>
                <span className="ml-2 font-bold text-sm text-emerald-400 uppercase">{doctorReview.decision}</span>
              </div>
              <span className="text-slate-400 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Reviewed by Registered Doctor
              </span>
            </div>

            {doctorReview.doctor_notes && (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="font-bold text-emerald-400 mb-1">Clinical Notes & Observations</div>
                <p className="text-slate-200 leading-relaxed">{doctorReview.doctor_notes}</p>
              </div>
            )}

            {prescription && prescription.prescription_data && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5 mb-2 text-sm">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" /> Official Signed Digital Prescription
                </div>
                <div className="space-y-2">
                  {(prescription.prescription_data.medications || prescription.prescription_data || []).map((med, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="font-semibold text-slate-100">{med.name} ({med.strength})</span>
                      <span className="text-slate-300">{med.frequency} for {med.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-dashed border-slate-700 text-center text-xs text-slate-400">
            ⏳ Pending Remote Doctor Review & Final Medical Decision.
          </div>
        )}
      </div>

    </div>
  );
}
