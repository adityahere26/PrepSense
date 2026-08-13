import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { transcribeAudioChunkWithGemini } from './services/gemini.js';

dotenv.config();

const wavFilePath = path.resolve(process.cwd(), 'speech_3s.wav');

async function runTest() {
  console.log('🧪 TESTING DECOUPLED AUDIO CHUNK TRANSCRIPTION WITH GEMINI API...\n');

  if (!fs.existsSync(wavFilePath)) {
    console.error('❌ speech_3s.wav file not found');
    process.exit(1);
  }

  const wavBuffer = fs.readFileSync(wavFilePath);
  const pcmBuffer = wavBuffer.subarray(44); // 16kHz 16-bit mono LE PCM

  console.log(`🎤 Input audio size: ${pcmBuffer.length} bytes (${(pcmBuffer.length / 32000).toFixed(2)} seconds)`);

  const base64Audio = pcmBuffer.toString('base64');

  console.log('⏳ Sending audio chunk to transcribeAudioChunkWithGemini...');
  const startTime = Date.now();
  const text = await transcribeAudioChunkWithGemini(base64Audio, 'audio/pcm;rate=16000');
  const elapsedMs = Date.now() - startTime;

  console.log(`\n======================================================`);
  console.log(`⏱️ Transcription completed in ${elapsedMs}ms`);
  console.log(`📝 Transcribed Text: "${text}"`);
  console.log(`======================================================\n`);

  if (text && text.trim().length > 0) {
    console.log('✅ TEST PASSED: Successfully transcribed audio chunk!');
    process.exit(0);
  } else {
    console.error('❌ TEST FAILED: Returned empty transcription');
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error('❌ Test error:', err);
  process.exit(1);
});
