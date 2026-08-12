import React from 'react';
import { Bot, Stethoscope, AlertTriangle, BookOpen, ShieldCheck, FileCheck2, UserCheck, Camera, FileText, Pill, Eye, RefreshCw, CheckCircle2 } from 'lucide-react';
import RiskBadge from './RiskBadge';

export default function AIDoctorVisualSeparation({ aiAssessment, doctorReview, prescription, documents = [], images = [] }) {
  const isAIProcessing = aiAssessment?.processing_status === 'processing';

  return (
    <div className="space-y-6">
      
      {/* 🤖 1. AI ASSISTANCE & CLINICAL ARTIFACTS SECTION */}
      <div className="rounded-lg bg-white border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                🤖 AI Assessment Summary & Clinical Artifacts
              </h3>
              <p className="text-xs text-slate-500">Database-backed AI synthesis, OCR extractions, and computer vision photo analysis.</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-1 rounded border border-blue-200">
            AI Data Layer
          </span>
        </div>

        {/* Realtime Processing Banner */}
        {isAIProcessing && (
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2 font-medium">
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
            <span>AI Patient Assessment is processing in real-time... Please wait while clinical protocols are retrieved.</span>
          </div>
        )}

        {aiAssessment ? (
          <div className="space-y-4 text-xs text-slate-800">
            
            {/* Risk Status */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-700">Rule Engine Risk Status:</span>
              <RiskBadge level={aiAssessment.risk_level} />
            </div>

            {/* AI Summary */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-bold text-blue-700 mb-1 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-blue-600" /> Patient Assessment Summary
              </div>
              <p className="leading-relaxed text-slate-800 font-medium">
                {aiAssessment.patient_summary || aiAssessment.summary || 'Patient Assessment Summary Logged'}
              </p>
            </div>

            {/* Step-by-Step First Aid Guidance */}
            {aiAssessment.first_aid_steps && aiAssessment.first_aid_steps.length > 0 && (
              <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-200 space-y-2">
                <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Step-by-Step First-Aid Guidance
                </div>
                <div className="space-y-1.5 text-slate-800">
                  {aiAssessment.first_aid_steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">{idx+1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supportive Protocol Medication Guidance (AI Prescription) */}
            {aiAssessment.supportive_medication_guidance && aiAssessment.supportive_medication_guidance.length > 0 && (
              <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200 space-y-2">
                <div className="font-bold text-blue-800 flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-blue-600" /> Protocol Supportive Care & Allowed OTC Medication Guidance
                </div>
                <div className="space-y-1 text-slate-800">
                  {aiAssessment.supportive_medication_guidance.map((med, idx) => (
                    <div key={idx} className="p-2 rounded-md bg-white border border-slate-200 text-xs">
                      • {med}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scanned Document OCR Data */}
            {documents && documents.length > 0 && (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" /> Scanned Document (OCR) Records ({documents.length})
                </div>
                {documents.map((doc, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1">
                    <div className="font-semibold text-slate-900">{doc.original_file_name || doc.file_name} ({doc.document_type})</div>
                    {doc.document_extractions?.[0]?.structured_data && (
                      <div className="text-slate-600">
                        Extracted: {JSON.stringify(doc.document_extractions[0].structured_data.medications || doc.document_extractions[0].structured_data)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* COMPLETE COMPUTER VISION & INJURY WOUND OBSERVATIONS (ALL FIELDS) */}
            {images && images.length > 0 && (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-4">
                <div className="font-bold text-purple-800 flex items-center gap-1.5 text-sm">
                  <Camera className="w-4 h-4 text-purple-600" /> Injury & Clinical Wound Photo Observations ({images.length})
                </div>
                
                {images.map((img, idx) => {
                  const imgUrl = img.image_url || null;
                  const cvData = img.computer_vision_analysis || {};
                  const obsFeatures = img.observable_features || [];
                  const warnings = img.warnings || [];

                  return (
                    <div key={idx} className="p-4 rounded-lg bg-white border border-slate-200 text-xs space-y-4 shadow-sm">
                      
                      {/* Render Actual Wound Photo Image */}
                      {imgUrl ? (
                        <div className="rounded-lg overflow-hidden border border-slate-200 max-h-72 bg-slate-100 flex items-center justify-center p-2">
                          <img src={imgUrl} alt="Uploaded Clinical Wound Photo" className="max-h-64 object-contain rounded w-full" />
                        </div>
                      ) : (
                        <div className="p-4 rounded bg-slate-100 border text-slate-500 text-center">
                          Image preview pending
                        </div>
                      )}

                      {/* 1. Computer Vision Surface Analysis Breakdown */}
                      <div className="space-y-2">
                        <div className="font-bold text-purple-900 flex items-center gap-1.5 text-xs">
                          <Eye className="w-4 h-4 text-purple-600" /> Computer Vision Surface Feature Breakdown:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="p-2.5 rounded-lg bg-purple-50/60 border border-purple-200">
                            <span className="font-bold text-purple-900 block text-[11px] uppercase tracking-wider mb-0.5">Tissue Margin Erythema</span>
                            <span className="text-slate-800 text-[11px] leading-snug block">
                              {cvData.tissue_margin || 'Not available from automated analysis'}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-purple-50/60 border border-purple-200">
                            <span className="font-bold text-purple-900 block text-[11px] uppercase tracking-wider mb-0.5">Surface Features & Swelling</span>
                            <span className="text-slate-800 text-[11px] leading-snug block">
                              {cvData.surface_features || 'Not available from automated analysis'}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-purple-50/60 border border-purple-200">
                            <span className="font-bold text-purple-900 block text-[11px] uppercase tracking-wider mb-0.5">Exudate & Moisture</span>
                            <span className="text-slate-800 text-[11px] leading-snug block">
                              {cvData.exudate_observation || 'Not available from automated analysis'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 2. Observable Features Bullet List */}
                      {obsFeatures && obsFeatures.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-200">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Detected Anatomical Features & Findings:
                          </div>
                          <div className="space-y-1 text-slate-700 pl-1">
                            {obsFeatures.map((feat, fIdx) => (
                              <div key={fIdx} className="flex items-start gap-1.5">
                                <span className="text-purple-600 font-bold">•</span>
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. Complete Untruncated Cautious Summary */}
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 space-y-1">
                        <div className="font-bold text-slate-900">Complete Cautious Summary for Doctor Review:</div>
                        <p className="leading-relaxed text-slate-800 text-[11px]">
                          {img.cautious_summary || 'No automated visual analysis is available for this photograph — please review the image directly.'}
                        </p>
                      </div>

                      {/* 4. Safety Warnings & Red Flag Guidance */}
                      {warnings && warnings.length > 0 && (
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1 text-[11px]">
                          <div className="font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Vision System Clinical Precautions:
                          </div>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-800">
                            {warnings.map((w, wIdx) => (
                              <li key={wIdx}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

            {/* Warning Flags */}
            {aiAssessment.warnings && aiAssessment.warnings.length > 0 && (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Warning Flags & Safety Checks
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-800">
                  {aiAssessment.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Protocol References */}
            {aiAssessment.protocol_matches && aiAssessment.protocol_matches.length > 0 && (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-blue-800 flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-4 h-4 text-blue-600" /> Approved MoHFW Clinical Protocols
                </div>
                <div className="space-y-2">
                  {aiAssessment.protocol_matches.map((p, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-white border border-slate-200">
                      <div className="font-semibold text-slate-900">{p.title} ({p.source || 'MoHFW'})</div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{p.guidance || p.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2 font-medium">
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
            <span>AI Patient Assessment is processing or pending for this visit. Uploads will appear live once generated.</span>
          </div>
        )}
      </div>

      {/* 👨‍⚕️ 2. DOCTOR DECISION SECTION */}
      <div className="rounded-lg bg-white border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                👨‍⚕️ Qualified Doctor Medical Decision
              </h3>
              <p className="text-xs text-slate-500">Final clinical diagnosis, prescription issuance, and treatment decisions by Registered Doctor.</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded border border-emerald-200">
            Doctor Medical Decision
          </span>
        </div>

        {doctorReview ? (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-600">Doctor Decision:</span>
                <span className="ml-2 font-bold text-sm text-emerald-700 uppercase">{doctorReview.decision}</span>
              </div>
              <span className="text-slate-600 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Reviewed by Registered Doctor
              </span>
            </div>

            {doctorReview.doctor_notes && (
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-emerald-800 mb-1">Clinical Notes & Observations</div>
                <p className="text-slate-800 leading-relaxed">{doctorReview.doctor_notes}</p>
              </div>
            )}

            {prescription && prescription.prescription_data && (
              <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-200">
                <div className="font-bold text-emerald-800 flex items-center gap-1.5 mb-2 text-sm">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" /> Official Signed Digital Prescription
                </div>
                <div className="space-y-2">
                  {(prescription.prescription_data.medications || prescription.prescription_data || []).map((med, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{med.name} ({med.strength})</span>
                      <span className="text-slate-600">{med.frequency} for {med.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
            ⏳ Pending Remote Doctor Review & Final Medical Decision.
          </div>
        )}
      </div>

    </div>
  );
}
