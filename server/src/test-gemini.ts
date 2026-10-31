import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('No GEMINI_API_KEY found in .env');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function run() {
  console.log('Testing connection with gemini-3.5-flash...');
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'Respond with exactly: Connection successful!',
    });

    console.log('\n[SUCCESS]');
    console.log('Model replied:', res.text?.trim());
  } catch (err: any) {
    console.error('\n[FAILED]');
    console.error('Error Code/Status:', err?.status || err?.code);
    console.error('Message:', err?.message);
    if (err?.cause) {
      console.error('Socket Cause:', err.cause);
    }
  }
}

run();