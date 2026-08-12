import { Groq } from 'groq-sdk';
import { config } from './env.js';

export const groq = config.groq.apiKey ? new Groq({ apiKey: config.groq.apiKey }) : null;
