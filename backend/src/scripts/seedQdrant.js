import dotenv from 'dotenv';
dotenv.config();
import { QdrantClient } from '@qdrant/js-client-rest';

const client = new QdrantClient({
  url: process.env.QDRANT_URL || 'https://cc6c04a5-4d82-4ada-83db-a20f1cddccb6.sa-east-1-0.aws.cloud.qdrant.io',
  apiKey: process.env.QDRANT_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6ZTM3ZmIxMjUtN2ZhOC00M2ViLTk2MGEtNTE0NmMwYWVmYjQzIn0.KRdeO2ajvAdbzYlg1i7_0pQXdlGWnLIyjH2YKOxGwdQ',
  checkCompatibility: false
});

const COLLECTION_NAME = 'clinical_protocols';

async function seedQdrant() {
  try {
    console.log(`📡 Connecting to Qdrant Cloud at ${process.env.QDRANT_URL}...`);

    // 1. Create collection if not exists
    try {
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 384,
          distance: 'Cosine'
        }
      });
      console.log(`📦 Created collection '${COLLECTION_NAME}'`);
    } catch (e) {
      console.log(`Note on collection creation: ${e.message}`);
    }

    // 2. Sample MoHFW Clinical Protocols
    const protocols = [
      {
        id: 101,
        payload: {
          title: 'Minor Superficial Wound & Abrasion First-Aid Protocol',
          category: 'First Aid',
          source: 'Ministry of Health & Family Welfare, Govt of India',
          version: '1.0',
          approved: true,
          content: 'PROCEDURE: 1. Wash hands with soap and water. 2. Clean wound gently with sterile saline or clean water. 3. Apply povidone-iodine antiseptic. 4. Apply clean dry sterile dressing. 5. Instruct patient to keep clean and dry. WARNING SIGNS: Continuous bleeding > 10 mins, pus, fever, severe pain -> Escalate to Doctor.'
        }
      },
      {
        id: 102,
        payload: {
          title: 'Acute Febrile Illness (Fever < 3 days) Triage Protocol',
          category: 'General Medicine',
          source: 'Indian Public Health Standards (IPHS) STG',
          version: '1.0',
          approved: true,
          content: 'PROCEDURE: 1. Record body temperature, SpO2, and BP. 2. Encourage oral fluids (ORS/water). 3. Cold sponging if temp > 101F. 4. Paracetamol 500mg symptomatic relief after doctor approval. WARNING SIGNS: SpO2 < 94%, breathlessness, stiff neck, altered sensorium -> Doctor consultation mandatory.'
        }
      },
      {
        id: 103,
        payload: {
          title: 'Emergency Triage Red-Flag Escalation Protocol',
          category: 'Emergency',
          source: 'Ministry of Health & Family Welfare, Govt of India',
          version: '1.0',
          approved: true,
          content: 'CRITICAL ESCALATION: SpO2 < 90%, Severe dyspnea, chest pain, systolic BP < 90 or > 180, unconsciousness, severe hemorrhage. ACTION: Immediate Doctor notification + Dispatch District Hospital Referral. Stop protocol guidance.'
        }
      }
    ];

    const points = protocols.map(p => {
      const vector = new Array(384).fill(0);
      const text = `${p.payload.title} ${p.payload.content}`.toLowerCase();
      text.split(/\s+/).forEach((w, idx) => {
        vector[idx % 384] = (w.charCodeAt(0) % 100) / 100;
      });
      return {
        id: p.id,
        vector,
        payload: p.payload
      };
    });

    console.log(`🚀 Upserting ${points.length} approved protocols into Qdrant vector DB...`);
    await client.upsert(COLLECTION_NAME, {
      wait: true,
      points
    });

    console.log('✅ Qdrant RAG Knowledge Base successfully seeded with metadata approved = true!');
  } catch (error) {
    console.error('❌ Qdrant seed error:', error.message);
  }
}

seedQdrant();
