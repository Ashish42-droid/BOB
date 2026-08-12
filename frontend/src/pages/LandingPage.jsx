import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, HeartPulse, Stethoscope, ArrowRight, AlertTriangle, Users, FileText, CheckCircle2, Mic, Eye, Globe2, Sparkles, Building2 } from 'lucide-react';
import ThreeDMedicalCanvas from '../components/ThreeDMedicalCanvas';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      
      {/* HERO SECTION WITH 3D CANVAS ANIMATION */}
      <section className="relative pt-16 pb-20 overflow-hidden px-4 lg:px-8 border-b border-slate-900">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-cyan-600/15 via-emerald-500/15 to-teal-400/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Left Hero Text */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              AI-Powered Virtual Clinic Platform for Rural Healthcare
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              Bringing AI-Assisted Healthcare <br />
              <span className="bg-gradient-to-r from-cyan-400 via-emerald-300 to-teal-200 bg-clip-text text-transparent">
                Closer to Rural Communities.
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl">
              Empowering village health assistants across India to digitally collect patient information, capture symptoms & vitals, digitize paper prescriptions via OCR, analyze injury photos, and prepare structured doctor-ready cases using verified MoHFW clinical protocols.
            </p>

            {/* Central Product Principle */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-xl max-w-xl backdrop-blur-md">
              <span className="text-xs uppercase tracking-widest font-extrabold text-emerald-400 block mb-1">Central Product Principle</span>
              <span className="text-base sm:text-lg font-bold text-white">AI prepares the case. The doctor makes the medical decision.</span>
            </div>

            {/* Login Actions */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link
                to="/login?role=CLINIC_ASSISTANT"
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-extrabold text-xs hover:brightness-110 shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Clinic Assistant Login
              </Link>
              <Link
                to="/login?role=DOCTOR"
                className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 font-extrabold text-xs border border-emerald-500/40 shadow-lg transition-all flex items-center gap-2"
              >
                <Stethoscope className="w-4 h-4" /> Doctor Login
              </Link>
              <Link
                to="/login?role=ADMIN"
                className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-300 font-extrabold text-xs border border-purple-500/40 shadow-lg transition-all flex items-center gap-2"
              >
                <Users className="w-4 h-4" /> Admin Login
              </Link>
            </div>
          </div>

          {/* Right 3D Interactive WebGL Globe / Node Canvas */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md glass-panel p-4 rounded-3xl border border-cyan-500/30 shadow-2xl relative">
              <div className="absolute top-3 left-4 text-xs font-bold text-slate-300 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
                India Telemedicine Grid
              </div>
              <ThreeDMedicalCanvas />
            </div>
          </div>

        </div>

        {/* Prominent Mandatory Safety Notice */}
        <div className="mt-12 max-w-5xl mx-auto p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-300 font-bold">Safety & Legal Position Notice: </strong>
            AI assistance does not replace professional medical diagnosis or treatment. Final clinical decisions are made by qualified healthcare professionals.
          </div>
        </div>
      </section>

      {/* INDIA-LEVEL IMPACT STATS BANNER */}
      <section className="py-10 bg-slate-900/60 border-b border-slate-900 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-4 rounded-2xl glass-card border border-slate-800">
            <div className="text-3xl font-extrabold text-cyan-400">142</div>
            <div className="text-xs text-slate-400 font-semibold mt-1">Village Clinics Connected</div>
          </div>
          <div className="p-4 rounded-2xl glass-card border border-slate-800">
            <div className="text-3xl font-extrabold text-emerald-400">12</div>
            <div className="text-xs text-slate-400 font-semibold mt-1">Indian States Covered</div>
          </div>
          <div className="p-4 rounded-2xl glass-card border border-slate-800">
            <div className="text-3xl font-extrabold text-purple-400">4,820+</div>
            <div className="text-xs text-slate-400 font-semibold mt-1">Rural Patients Served</div>
          </div>
          <div className="p-4 rounded-2xl glass-card border border-slate-800">
            <div className="text-3xl font-extrabold text-amber-400">4.2 Mins</div>
            <div className="text-xs text-slate-400 font-semibold mt-1">Avg Doctor Response Time</div>
          </div>
        </div>
      </section>

      {/* PROBLEM vs SOLUTION SECTION */}
      <section className="py-16 px-4 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Core Problem */}
          <div className="glass-panel p-8 rounded-3xl border-rose-500/20 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white mb-3">Rural Healthcare Challenges</h2>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>Severe shortage of qualified doctors in remote sub-centres and Primary Health Centres (PHCs).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>Patients travel several hours over difficult rural terrain to reach district hospitals.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>Paper-based prescriptions lead to lost medical history and repeated diagnostic costs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>Language and literacy barriers prevent accurate symptom communication.</span>
              </li>
            </ul>
          </div>

          {/* Solution */}
          <div className="glass-panel p-8 rounded-3xl border-cyan-500/20 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-4">
              <HeartPulse className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white mb-3">The Virtual Clinic Solution</h2>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Multilingual Voice Input:</strong> Assistant records symptoms in native dialect (Hindi, Tamil, Telugu, etc.).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>OCR & Document Digitization:</strong> Upload old paper prescriptions with mandatory human verification.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>MoHFW RAG & Protocol Engine:</strong> Retrieves approved Indian government clinical guidelines for safety.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Doctor-in-the-Loop Teleconsultation:</strong> Structured handoff to remote doctors via encrypted ZegoCloud video calls.</span>
              </li>
            </ul>
          </div>

        </div>
      </section>

      {/* 6-STEP PRODUCT WORKFLOW */}
      <section className="py-16 px-4 lg:px-8 max-w-7xl mx-auto w-full border-t border-slate-900">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">How The Virtual Clinic Works</h2>
          <p className="text-slate-400 text-sm mt-2">End-to-End Clinical Journey (Section 3 Workflow)</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {[
            { step: '1', title: 'Register Patient', desc: 'Assistant creates patient code & preferred language. No patient login required.', icon: <Users className="w-5 h-5 text-cyan-400" /> },
            { step: '2', title: 'Capture Data', desc: 'Symptoms via Voice, Vitals, Prescription OCR, & Injury photos.', icon: <Mic className="w-5 h-5 text-emerald-400" /> },
            { step: '3', title: 'AI Assesses', desc: 'Groq LLM + Qdrant RAG retrieve approved MoHFW protocols.', icon: <FileText className="w-5 h-5 text-purple-400" /> },
            { step: '4', title: 'Risk Detected', desc: 'Safety rules triage into GREEN, YELLOW, or RED EMERGENCY.', icon: <AlertTriangle className="w-5 h-5 text-amber-400" /> },
            { step: '5', title: 'Doctor Reviews', desc: 'Qualified doctor inspects AI summary, vitals, OCR, & launches Video call.', icon: <Stethoscope className="w-5 h-5 text-cyan-400" /> },
            { step: '6', title: 'Professional Care', desc: 'Doctor issues signed digital prescription & longitudinal history update.', icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" /> }
          ].map((item, idx) => (
            <div key={idx} className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-900 text-slate-300 font-extrabold text-xs flex items-center justify-center border border-slate-700">
                    {item.step}
                  </span>
                  {item.icon}
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-normal">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto py-8 px-4 border-t border-slate-900 text-center text-xs text-slate-500">
        Virtual Village Clinic — Grounded in MoHFW Standard Treatment Guidelines & Telemedicine Practice Guidelines.
      </footer>
    </div>
  );
}
