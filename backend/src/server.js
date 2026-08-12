import app from './app.js';
import { config } from './config/env.js';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
======================================================================
🏥 VIRTUAL VILLAGE CLINIC AI BACKEND SERVER RUNNING
======================================================================
🚀 API Endpoint: http://localhost:${PORT}/api
🏥 Health Check: http://localhost:${PORT}/api/health
⚡ Groq LLM: ${config.groq.apiKey ? 'CONNECTED' : 'MOCK/FALLBACK'}
🔍 Qdrant RAG: ${config.qdrant.url ? 'CONNECTED' : 'MOCK/FALLBACK'}
📊 Supabase DB: ${config.supabase.url ? 'CONNECTED' : 'MOCK/FALLBACK'}
📹 ZegoCloud: ${config.zegoCloud.appId ? 'CONFIGURED' : 'MOCK/FALLBACK'}
======================================================================
  `);
});
