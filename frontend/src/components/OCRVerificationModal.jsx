import React, { useState } from 'react';
import { FileText, CheckCircle2, Edit3, Save, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function OCRVerificationModal({ documentId, initialData, rawText, onVerified, onClose }) {
  const [medications, setMedications] = useState(initialData?.medications || []);
  const [docNotes, setDocNotes] = useState(initialData?.diagnosis_notes || '');
  const [editingIndex, setEditingIndex] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleEditChange = (index, field, value) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      { name: '', strength: '', frequency: '', duration: '', instructions: '' }
    ]);
  };

  const handleConfirmVerification = async () => {
    setSaving(true);
    try {
      const verifiedPayload = {
        document_type: initialData?.document_type || 'prescription',
        medications,
        diagnosis_notes: docNotes,
        verified_at: new Date().toISOString()
      };

      await api.post(`/documents/${documentId}/verify`, {
        verified_data: verifiedPayload
      });

      if (onVerified) onVerified(verifiedPayload);
      if (onClose) onClose();
    } catch (err) {
      alert('Verification failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-3xl rounded-lg border border-slate-200 p-6 shadow-xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Mandatory OCR Document Verification
                <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">Assistant Verification Required</span>
              </h3>
              <p className="text-xs text-slate-500">Review AI-extracted prescription data before confirming to patient digital record.</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Safety Rule: OCR extractions do NOT automatically overwrite patient record. Verify medicine details carefully before clicking Confirm.</span>
          </div>

          {/* Extracted Medications List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Extracted Medications & Dosage</h4>
              <button
                type="button"
                onClick={handleAddMedication}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                + Add Medication
              </button>
            </div>

            <div className="space-y-3">
              {medications.map((med, idx) => (
                <div key={idx} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  {editingIndex === idx ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
                      <input
                        type="text"
                        value={med.name}
                        onChange={(e) => handleEditChange(idx, 'name', e.target.value)}
                        placeholder="Medicine Name"
                        className="bg-white border border-slate-300 text-xs text-slate-900 rounded px-2.5 py-1.5 focus:border-blue-500 outline-none"
                      />
                      <input
                        type="text"
                        value={med.strength}
                        onChange={(e) => handleEditChange(idx, 'strength', e.target.value)}
                        placeholder="Strength (e.g. 500mg)"
                        className="bg-white border border-slate-300 text-xs text-slate-900 rounded px-2.5 py-1.5 focus:border-blue-500 outline-none"
                      />
                      <input
                        type="text"
                        value={med.frequency}
                        onChange={(e) => handleEditChange(idx, 'frequency', e.target.value)}
                        placeholder="Frequency"
                        className="bg-white border border-slate-300 text-xs text-slate-900 rounded px-2.5 py-1.5 focus:border-blue-500 outline-none"
                      />
                      <input
                        type="text"
                        value={med.duration}
                        onChange={(e) => handleEditChange(idx, 'duration', e.target.value)}
                        placeholder="Duration"
                        className="bg-white border border-slate-300 text-xs text-slate-900 rounded px-2.5 py-1.5 focus:border-blue-500 outline-none"
                      />
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                        {med.name}
                        <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">{med.strength}</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        Frequency: <span className="text-slate-900 font-medium">{med.frequency}</span> | Duration: <span className="text-slate-900 font-medium">{med.duration}</span> {med.instructions && `(${med.instructions})`}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {editingIndex === idx ? (
                      <button
                        type="button"
                        onClick={() => setEditingIndex(null)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingIndex(idx)}
                          className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Text Accordion */}
          {rawText && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Raw OCR Text Output</h4>
              <pre className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 overflow-x-auto max-h-32">
                {rawText}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmVerification}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" /> {saving ? 'Saving...' : 'CONFIRM & SAVE TO PATIENT RECORD'}
          </button>
        </div>

      </div>
    </div>
  );
}
