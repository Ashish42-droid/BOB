import http from 'http';
import app from './app.js';
import { config } from './config/env.js';
import { setupSignalingServer } from './services/signalingService.js';

const PORT = config.port || 5000;
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
const WS_URL = process.env.WS_URL || `ws://localhost:${PORT}`;

const server = http.createServer(app);

// Mount WebRTC Raw WebSocket Signaling Server on /signal
setupSignalingServer(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
======================================================================
🏥 VIRTUAL VILLAGE CLINIC AI BACKEND SERVER RUNNING
======================================================================
🚀 API Endpoint: ${BACKEND_URL}/api
🏥 Health Check: ${BACKEND_URL}/api/health
📡 WebRTC Signal: ${WS_URL}/signal
⚡ Groq LLM: ${config.groq.apiKey ? 'CONNECTED' : 'MOCK/FALLBACK'}
🔍 Qdrant RAG: ${config.qdrant.url ? 'CONNECTED' : 'MOCK/FALLBACK'}
📊 Supabase DB: ${config.supabase.url ? 'CONNECTED' : 'MOCK/FALLBACK'}
======================================================================
  `);
});
