import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft, CheckCircle2, Shield, AlertTriangle } from 'lucide-react';
import api from '../services/api';

export default function PatientRegistrationPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    age_years: '',
    date_of_birth: '',
    gender: 'male',
    phone: '',
    village: 'Rampur',
    district: 'Rampur',
    state: 'Uttar Pradesh',
    preferred_language: 'Hindi',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setValidationError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Strict Age Limits Check (0 to 150 years)
    const ageVal = parseInt(formData.age_years);
    if (isNaN(ageVal) || ageVal < 0 || ageVal > 150) {
      setValidationError('Age must be a valid number between 0 and 150 years.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        name: formData.full_name,
        age: ageVal,
        age_years: ageVal,
        gender: formData.gender.toLowerCase()
      };

      const res = await api.post('/patients', payload);
      alert(`Patient Registered Successfully in Supabase Database! Code: ${res.data.patient_code}`);
      navigate(`/assistant/assessment/${res.data.id}`);
    } catch (err) {
      alert('Registration failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Register New Village Patient</h1>
          <p className="text-xs text-slate-500">29-Table Schema Integrated — Managed by Village Health Assistant.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm space-y-6">
        
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2 font-medium">
          <Shield className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Patient data is inserted directly into your Supabase PostgreSQL database tables.</span>
        </div>

        {validationError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            {validationError}
          </div>
        )}

        {/* Demographics Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Patient Name *</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="e.g. Ashish Kumar"
              required
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Age in Years (0 - 150) *</label>
            <input
              type="number"
              name="age_years"
              min="0"
              max="150"
              value={formData.age_years}
              onChange={handleChange}
              placeholder="e.g. 26"
              required
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth (Optional)</label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Village *</label>
            <input
              type="text"
              name="village"
              value={formData.village}
              onChange={handleChange}
              placeholder="e.g. Rampur"
              required
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 9876543210"
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
            <input
              type="text"
              name="district"
              value={formData.district}
              onChange={handleChange}
              placeholder="District"
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Spoken Language *</label>
            <select
              name="preferred_language"
              value={formData.preferred_language}
              onChange={handleChange}
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
            >
              <option value="Hindi">Hindi (हिंदी)</option>
              <option value="English">English</option>
              <option value="Tamil">Tamil (தமிழ்)</option>
              <option value="Telugu">Telugu (తెలుగు)</option>
              <option value="Bengali">Bengali (বাংলা)</option>
              <option value="Marathi">Marathi (मराठी)</option>
            </select>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Person Name</label>
            <input
              type="text"
              name="emergency_contact_name"
              value={formData.emergency_contact_name}
              onChange={handleChange}
              placeholder="Family / Guardian Name"
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Phone Number</label>
            <input
              type="tel"
              name="emergency_contact_phone"
              value={formData.emergency_contact_phone}
              onChange={handleChange}
              placeholder="+91 Contact Number"
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" /> {loading ? 'Saving patient record...' : 'Register Patient & Start Assessment'}
        </button>

      </form>
    </div>
  );
}
