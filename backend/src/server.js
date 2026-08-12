import http from 'http';
import app from './app.js';
import { config } from './config/env.js';
import { setupSignalingServer } from './services/signalingService.js';

const PORT = config.port || 5000;

const server = http.createServer(app);

// Mount WebRTC Raw WebSocket Signaling Server on /signal
setupSignalingServer(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
======================================================================
🏥 VIRTUAL VILLAGE CLINIC AI BACKEND SERVER RUNNING
======================================================================
🚀 API Endpoint: http://localhost:${PORT}/api
🏥 Health Check: http://localhost:${PORT}/api/health
📡 WebRTC Signal: ws://localhost:${PORT}/signal
⚡ Groq LLM: ${config.groq.apiKey ? 'CONNECTED' : 'MOCK/FALLBACK'}
🔍 Qdrant RAG: ${config.qdrant.url ? 'CONNECTED' : 'MOCK/FALLBACK'}
📊 Supabase DB: ${config.supabase.url ? 'CONNECTED' : 'MOCK/FALLBACK'}
======================================================================
  `);
});
