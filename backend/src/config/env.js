import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'virtual_village_clinic_jwt_secret',
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
  },
  qdrant: {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
  },
  zegoCloud: {
    appId: process.env.ZEGOCLOUD_APP_ID,
    serverSecret: process.env.ZEGOCLOUD_SERVER_SECRET,
  }
};
