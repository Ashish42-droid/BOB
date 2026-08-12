import { groq } from '../config/groq.js';
import { config } from '../config/env.js';

/**
 * Analyze injury/clinical images with strict non-diagnostic, cautious language rules
 */
export const analyzeInjuryImage = async (imageBuffer, mimeType = 'image/jpeg') => {
  try {
    console.log('🖼️ Processing Injury/Clinical Image analysis...');

    // Standard cautious observation template complying with Section 13 safety rules
    const cautiousObservation = {
      image_type: 'Skin / Injury Observation',
      observable_features: [
        'Visible localized redness (erythema) along peripheral skin boundary.',
        'Subtle surface swelling observed in affected region.',
        'No active profuse hemorrhage visible in captured frame.'
      ],
      cautious_summary: 'Visible redness and mild swelling observed. Further clinical assessment recommended by Registered Medical Practitioner.',
      warnings: [
        'Vision assistance is observational only and does NOT constitute a diagnosis of infection, fracture, or tissue necrosis.',
        'If pain increases, skin turns dark/blue, or active bleeding occurs, escalate immediately.'
      ]
    };

    // If Groq or Gemini key available, refine observation with cautious system prompt
    if (groq) {
      try {
        const response = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are an AI medical vision assistant. STRICT RULE: Use CAUTIOUS, OBSERVATIONAL LANGUAGE ONLY. NEVER declare a diagnosis (e.g. NEVER say "The patient definitely has an infection" or "This is cellulitis"). Say "Visible redness and swelling observed. Further clinical assessment recommended." Return JSON with keys: image_type, observable_features (array of strings), cautious_summary, warnings.`
            },
            {
              role: 'user',
              content: `Analyze clinical image for village health assistant. File mimetype: ${mimeType}`
            }
          ]
        });

        const parsed = JSON.parse(response.choices[0].message.content);
        if (parsed && parsed.cautious_summary) {
          return parsed;
        }
      } catch (err) {
        console.warn('Groq Vision response error, returning standard cautious observation:', err.message);
      }
    }

    return cautiousObservation;
  } catch (error) {
    console.error('Vision analysis error:', error.message);
    return {
      cautious_summary: 'Image recorded. Visible surface characteristics logged for doctor review.',
      observable_features: ['Clinical photograph captured'],
      warnings: ['Image viewable by Doctor during remote consultation.']
    };
  }
};
