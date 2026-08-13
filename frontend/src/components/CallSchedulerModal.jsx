import React, { useState } from 'react';
import { Calendar, AlertTriangle, CheckCircle2, X, Users } from 'lucide-react';
import api from '../services/api';
import DoctorSelectGrid from './DoctorSelectGrid';

/**
 * Books video consultations for one patient with ONE OR MORE doctors at the
 * same time slot. Each selected doctor gets their own appointment + waiting
 * video room (slot collisions are checked per doctor on the server).
 */
export default function CallSchedulerModal({ patient, visitId, preselectedDoctor, onClose, onScheduled }) {
  const [selectedDoctors, setSelectedDoctors] = useState(preselectedDoctor ? [preselectedDoctor] : []);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().substring(0, 10));
  const [scheduledTime, setScheduledTime] = useState('10:30');
  const [reason, setReason] = useState('Follow-up teleconsultation');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null); // [{doctor, ok, message}]
  const [formError, setFormError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (selectedDoctors.length === 0) {
      setFormError('Select at least one doctor for the consultation.');
      return;
    }

    const targetDate = new Date(`${scheduledDate}T${scheduledTime}:00`);
    if (isNaN(targetDate.getTime())) {
      setFormError('Select a valid date and time.');
      return;
    }

    setLoading(true);
    const outcomes = [];

    // One booking per selected doctor — same time slot, different doctors.
    for (const doctor of selectedDoctors) {
      try {
        const res = await api.post('/calls/schedule', {
          visit_id: visitId,
          patient_id: patient?.id,
          doctor_id: doctor.id,
          patient_name: patient?.full_name || patient?.name || 'Patient',
          patient_code: patient?.patient_code || 'PAT-RECORD',
          scheduled_time: targetDate.toISOString(),
          reason
        });
        outcomes.push({ doctor, ok: true, message: `Booked for ${new Date(res.data.scheduled_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}` });
      } catch (err) {
        outcomes.push({ doctor, ok: false, message: err.response?.data?.error || err.message || 'Booking failed' });
      }
    }

    setResults(outcomes);
    setLoading(false);

    const booked = outcomes.filter((o) => o.ok);
    if (booked.length > 0 && onScheduled) {
      onScheduled(booked);
    }
    // Keep failed doctors selected so the assistant can retry with a new slot
    setSelectedDoctors(outcomes.filter((o) => !o.ok).map((o) => o.doctor));
  };

  const allBooked = results && results.every((r) => r.ok);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl p-6 space-y-5">

        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">Book Video Consultations</h3>
              <p className="text-[11px] text-slate-500">
                Patient: <strong className="text-slate-700">{patient?.full_name || patient?.name || 'Patient'}</strong>
                {patient?.patient_code && <> · <span className="font-mono text-blue-600">{patient.patient_code}</span></>}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {results && (
          <div className="space-y-2">
            {results.map((r) => (
              <div
                key={r.doctor.id}
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 font-medium ${
                  r.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {r.ok
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
                <span><strong>{r.doctor.name}</strong> ({r.doctor.specialization}): {r.message}</span>
              </div>
            ))}
            {allBooked && (
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors"
              >
                All consultations booked — Close
              </button>
            )}
          </div>
        )}

        {!allBooked && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">

            <div>
              <label className="font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Select one or more doctors ({selectedDoctors.length} selected):
              </label>
              <DoctorSelectGrid
                multiSelect
                compact
                selected={selectedDoctors}
                onChange={setSelectedDoctors}
              />
              <p className="text-[10px] text-slate-500 mt-1.5">
                You can book the same time slot with several doctors — each doctor gets their own video room.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date:</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-blue-500 outline-none font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Time (24h, 08:00-20:00):</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-blue-500 outline-none font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Consultation Reason / Clinical Note:</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-blue-500 outline-none font-medium"
                required
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold shadow-sm transition-colors"
              >
                {loading
                  ? 'Booking...'
                  : `Book ${selectedDoctors.length || ''} Consultation${selectedDoctors.length === 1 ? '' : 's'}`}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
