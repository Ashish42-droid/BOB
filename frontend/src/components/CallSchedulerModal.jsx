import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import api from '../services/api';

export default function CallSchedulerModal({ patient, visitId, onClose, onScheduled }) {
  const [selectedDoctor, setSelectedDoctor] = useState('Dr. Rajesh Sharma (AIIMS New Delhi)');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().substring(0, 10));
  const [scheduledTime, setScheduledTime] = useState('10:30');
  const [reason, setReason] = useState('Follow-up AI Clinical Teleconsultation');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const fullDateTimeStr = `${scheduledDate}T${scheduledTime}:00`;
      const targetDate = new Date(fullDateTimeStr);

      if (isNaN(targetDate.getTime())) {
        setError('Please select a valid date and time.');
        setLoading(false);
        return;
      }

      const res = await api.post('/calls/schedule', {
        visit_id: visitId,
        patient_id: patient?.id,
        doctor_id: 'dr_rajesh_sharma',
        doctor_name: selectedDoctor,
        patient_name: patient?.full_name || patient?.name || 'Patient',
        patient_code: patient?.patient_code || 'PAT-RECORD',
        scheduled_time: targetDate.toISOString(),
        reason
      });

      setSuccess(true);
      setTimeout(() => {
        if (onScheduled) onScheduled(res.data);
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Failed to schedule call:', err);
      setError(err.response?.data?.error || err.message || 'Call scheduling failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl p-6 space-y-5">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Schedule Teleconsultation Call</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Teleconsultation call scheduled successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Remote Specialist Doctor:</label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-blue-500 outline-none font-medium"
            >
              <option value="Dr. Rajesh Sharma (AIIMS New Delhi)">Dr. Rajesh Sharma (AIIMS New Delhi) - General Physician</option>
              <option value="Dr. Ananya Sen (JIPMER Puducherry)">Dr. Ananya Sen (JIPMER Puducherry) - Pediatrician</option>
              <option value="Dr. Vikramaditya Rao (PGIMER Chandigarh)">Dr. Vikramaditya Rao (PGIMER Chandigarh) - Cardiologist</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Available Shift: 08:00 AM - 08:00 PM (Mon-Sat)</p>
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
              <label className="block font-semibold text-slate-700 mb-1">Time (24h):</label>
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
              disabled={loading || success}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors"
            >
              {loading ? 'Scheduling...' : 'Confirm Call Appointment'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
