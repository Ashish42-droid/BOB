import { config } from './env.js';

/**
 * Minimal Gemini REST client (no SDK dependency).
 * Used for multimodal work (document OCR, wound-photo analysis) because the
 * configured Groq key exposes no vision-capable models.
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export const geminiAvailable = () => Boolean(config.gemini.apiKey);

/**
 * Calls Gemini with an optional inline image and returns parsed JSON.
 * @param {string} systemInstruction - system prompt
 * @param {string} userText - user prompt text
 * @param {{ base64?: string, mimeType?: string }} [image] - optional inline image
 * @returns {Promise<object|null>} parsed JSON object, or null on any failure
 */
export const geminiGenerateJson = async (systemInstruction, userText, image = null) => {
  if (!config.gemini.apiKey) return null;

  const parts = [{ text: userText }];
  if (image?.base64) {
    parts.push({ inline_data: { mime_type: image.mimeType || 'image/jpeg', data: image.base64 } });
  }

  const body = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json'
    }
  };

  try {
    const res = await fetch(`${BASE_URL}?key=${config.gemini.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    if (!text) return null;
    return JSON.parse(text);
  } catch (err) {
    console.warn('Gemini call failed:', err.message);
    return null;
  }
};
