import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patient.routes.js';
import visitRoutes from './routes/visit.routes.js';
import documentRoutes from './routes/document.routes.js';
import aiRoutes from './routes/ai.routes.js';
import doctorRoutes from './routes/doctor.routes.js';
import consultationRoutes from './routes/consultation.routes.js';
import adminRoutes from './routes/admin.routes.js';
import visionRoutes from './routes/vision.routes.js';
import voiceRoutes from './routes/voice.routes.js';
import callRoutes from './routes/call.routes.js';

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve the built frontend (frontend/dist) when it exists — lets a single
// Railway service host the whole app: UI + /api + /signal on one origin.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.resolve(__dirname, '../../frontend/dist');
const HAS_FRONTEND = fs.existsSync(path.join(FRONTEND_DIST, 'index.html'));
if (HAS_FRONTEND) {
  app.use(express.static(FRONTEND_DIST));
}

// Root API Endpoint Welcome
app.get(HAS_FRONTEND ? '/api' : ['/', '/api'], (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Virtual Village Clinic AI Backend API',
    endpoints: {
      health: '/api/health',
      patients: '/api/patients',
      visits: '/api/visits',
      ai: '/api/ai',
      vision: '/api/vision',
      voice: '/api/voice',
      doctor: '/api/doctor',
      calls: '/api/calls',
      consultations: '/api/consultations'
    }
  });
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'Virtual Village Clinic AI Backend API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/admin', adminRoutes);

// SPA fallback: any non-API GET serves the frontend router
if (HAS_FRONTEND) {
  app.get(/^\/(?!api\/|signal).*/, (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

export default app;
