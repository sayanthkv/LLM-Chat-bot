import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('Missing GEMINI_API_KEY in environment variables.');
}

// Initialize the GoogleGenAI instance once
export const ai = new GoogleGenAI({ apiKey });