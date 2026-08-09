import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

async function checkModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('API Key present:', Boolean(apiKey));
  if (!apiKey) return;

  const ai = new GoogleGenAI({ apiKey });

  try {
    const list = await ai.models.list();
    console.log('Fetched models list type:', typeof list);
    
    // Iterate over async iterable or array
    const models: string[] = [];
    for await (const m of list as any) {
      const name = m.name || m.id || m;
      models.push(name);
    }

    console.log('Available models count:', models.length);
    console.log('Models list:', models.slice(0, 20));
  } catch (err: any) {
    console.error('Failed to list models:', err?.message || err);
  }
}

checkModels();
