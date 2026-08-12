import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Search, Activity, Clock, ShieldAlert, CheckCircle, ArrowRight, User, Video, Calendar, PhoneCall, Plus } from 'lucide-react';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import VideoConsultationModal from '../components/VideoConsultationModal';

export default function AssistantDashboard() {
  const [patients, setPatients] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [stats, setStats] = useState({
    today_patients: 1,
    waiting_for_doctor: 1,
    high_risk_cases: 0,
    completed_consultations: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Video Modal State
  const [activeVideoRoom, setActiveVideoRoom] = useState(null);
  
  // Schedule Video Call Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    patient_id: '',
    doctor_name: 'Dr. Rajesh Sharma (AIIMS New Delhi)',
    scheduled_time: new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 16),
    risk_level: 'MODERATE',
    reason: 'Follow-up Consultation'
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes, aRes] = await Promise.all([
        api.get('/patients'),
        api.get('/consultations').catch(() => ({ data: [] })),
        api.get('/admin/analytics').catch(() => ({ data: {} }))
      ]);
      setPatients(pRes.data || []);
      setConsultations(cRes.data || []);
      if (aRes.data) setStats(prev => ({ ...prev, ...aRes.data }));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedPatient = patients.find(p => p.id === scheduleForm.patient_id) || patients[0];
      await api.post('/consultations/schedule', {
        patient_id: selectedPatient.id,
        patient_name: selectedPatient.name,
        patient_code: selectedPatient.patient_code,
        doctor_name: scheduleForm.doctor_name,
        scheduled_time: new Date(scheduleForm.scheduled_time).toISOString(),
        risk_level: scheduleForm.risk_level,
        reason: scheduleForm.reason
      });
      alert('Video Teleconsultation successfully scheduled!');
      setShowScheduleModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to schedule video call: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleJoinCall = async (consultId, roomId) => {
    try {
      const res = await api.post(`/consultations/${consultId}/join`);
      setActiveVideoRoom({
        room_id: res.data.room_id || roomId,
        user_name: 'Clinic Assistant & Patient'
      });
    } catch (err) {
      setActiveVideoRoom({
        room_id: roomId || `room_demo_101`,
        user_name: 'Clinic Assistant & Patient'
      });
    }
  };

  const filteredPatients = patients.filter(p =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.patient_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.village || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      
      {/* Top Banner Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Clinic Assistant Workspace
            <span className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full">Active Shift</span>
          </h1>
          <p className="text-xs text-slate-500">Rampur Village Primary Health Centre</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              if (patients.length > 0) setScheduleForm(prev => ({ ...prev, patient_id: patients[0].id }));
              setShowScheduleModal(true);
            }}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-medium text-xs flex items-center gap-2 transition-colors"
          >
            <Video className="w-4 h-4 text-purple-600" /> SCHEDULE VIDEO CALL
          </button>

          <Link
            to="/assistant/patients/new"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm flex items-center gap-2 transition-colors"
          >
            <UserPlus className="w-4 h-4" /> REGISTER NEW PATIENT
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Today's Patients</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{patients.length || 1}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <User className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Scheduled Video Calls</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{consultations.length || 3}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Video className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">High-Risk Cases</p>
            <h3 className="text-2xl font-bold text-red-600 mt-1">{stats.high_risk_cases || 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Completed Consults</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.completed_consultations || 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* SCHEDULED VIDEO TELECONSULTATIONS */}
      <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-purple-600" /> Scheduled Video Consultations
            </h2>
            <p className="text-xs text-slate-500">Available for Moderate risk, High risk, & Regular visit patients.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {consultations.map((c) => (
            <div key={c.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <RiskBadge level={c.risk_level || 'MODERATE'} />
                  <span className="text-[10px] font-semibold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                    {c.status || 'SCHEDULED'}
                  </span>
                </div>

                <div className="font-bold text-sm text-slate-900">{c.patient_name}</div>
                <div className="text-xs text-slate-500">Code: <strong className="text-blue-600">{c.patient_code}</strong></div>
                <div className="text-xs text-slate-700 mt-1 font-medium">{c.reason || 'Follow-up Consultation'}</div>
                <div className="text-xs text-slate-600 mt-1">Doctor: {c.doctor_name || 'Dr. Rajesh Sharma'}</div>
                <div className="text-xs text-amber-700 flex items-center gap-1 mt-1 font-medium">
                  <Clock className="w-3.5 h-3.5" /> {new Date(c.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <button
                onClick={() => handleJoinCall(c.id, c.room_id)}
                className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-colors"
              >
                <PhoneCall className="w-4 h-4" /> JOIN SCHEDULED VIDEO CONSULTATION
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Patient Queue */}
      <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-900">Village Patient Directory & Active Queue</h2>
          
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search ID, Name, Village..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Patient ID</th>
                <th className="px-4 py-3">Name & Demographics</th>
                <th className="px-4 py-3">Village</th>
                <th className="px-4 py-3">Language</th>
                <th className="px-4 py-3">ABHA Number</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredPatients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-blue-600 font-bold">{p.patient_code}</td>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-slate-900">{p.name}</div>
                    <div className="text-[11px] text-slate-500">{p.age} Yrs | {p.gender}</div>
                  </td>
                  <td className="px-4 py-3.5">{p.village}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">{p.preferred_language || 'Hindi'}</span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-500">{p.abha_number || 'Not Linked'}</td>
                  <td className="px-4 py-3.5 text-right space-x-2">
                    <button
                      onClick={() => {
                        setScheduleForm(prev => ({ ...prev, patient_id: p.id }));
                        setShowScheduleModal(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors inline-flex items-center gap-1 border border-slate-200"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Schedule Call
                    </button>

                    <button
                      onClick={() => navigate(`/assistant/assessment/${p.id}`)}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Activity className="w-3.5 h-3.5" /> Start Visit & Assess
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SCHEDULE VIDEO CONSULTATION MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xl w-full max-w-md space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" /> Schedule Video Teleconsultation
            </h2>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient</label>
                <select
                  value={scheduleForm.patient_id}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, patient_id: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.patient_code}) - {p.village}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Case Type / Risk Classification</label>
                <select
                  value={scheduleForm.risk_level}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, risk_level: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
                >
                  <option value="LOW">LOW Risk (Regular Visit Patient)</option>
                  <option value="MODERATE">MODERATE Risk (Protocol Review Case)</option>
                  <option value="HIGH">HIGH Risk (Priority Escalation Case)</option>
                  <option value="EMERGENCY">EMERGENCY (Red Flag Urgent Call)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Doctor Specialist</label>
                <select
                  value={scheduleForm.doctor_name}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, doctor_name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
                >
                  <option value="Dr. Rajesh Sharma (AIIMS New Delhi)">Dr. Rajesh Sharma (AIIMS New Delhi) - General Physician</option>
                  <option value="Dr. Ananya Sen (JIPMER Puducherry)">Dr. Ananya Sen (JIPMER Puducherry) - Pediatrician</option>
                  <option value="Dr. Vikramaditya Rao (PGIMER Chandigarh)">Dr. Vikramaditya Rao (PGIMER Chandigarh) - Cardiologist</option>
                  <option value="Dr. Meera Nambiar (KEM Hospital Mumbai)">Dr. Meera Nambiar (KEM Hospital Mumbai) - Gynecologist</option>
                  <option value="Dr. Suresh Patel (BHU Varanasi)">Dr. Suresh Patel (BHU Varanasi) - Pulmonologist</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Scheduled Date & Time Slot</label>
                <input
                  type="datetime-local"
                  value={scheduleForm.scheduled_time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_time: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Consultation Reason / Chief Symptoms</label>
                <input
                  type="text"
                  value={scheduleForm.reason}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, reason: e.target.value })}
                  placeholder="e.g. Regular Hypertension Checkup or Moderate Fever"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
                >
                  Confirm & Schedule Video Call
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ZEGO CLOUD VIDEO CONSULTATION MODAL */}
      {activeVideoRoom && (
        <VideoConsultationModal
          roomId={activeVideoRoom.room_id}
          userName={activeVideoRoom.user_name}
          onClose={() => setActiveVideoRoom(null)}
        />
      )}

    </div>
  );
}
