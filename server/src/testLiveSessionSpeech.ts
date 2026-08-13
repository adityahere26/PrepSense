import dotenv from 'dotenv';
import http from 'http';
import express from 'express';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './db.js';
import { setupLiveInterviewWebSocket } from './services/liveInterviewWs.js';

dotenv.config();

const wavFilePath = path.resolve(process.cwd(), 'speech_3s.wav');

async function runLiveSessionSpeechTest() {
  console.log('🧪 RUNNING GEMINI LIVE REAL SPEECH AUDIO TEST SESSION...\n');

  let user = await prisma.user.findFirst({
    where: { email: 'live_test_user@prepsense.ai' },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'live_test_user@prepsense.ai',
        name: 'Live Test Candidate',
        targetRole: 'Senior Software Engineer',
      },
    });
  }

  const session = await prisma.interviewSession.create({
    data: {
      userId: user.id,
      targetRole: 'Senior Software Engineer',
      status: 'in_progress',
      questions: {
        create: [
          {
            order: 1,
            category: 'technical',
            questionText: 'Can you explain how you handle concurrency and state management in high-throughput microservices?',
          },
        ],
      },
    },
  });

  const app = express();
  const server = http.createServer(app);
  setupLiveInterviewWebSocket(server);

  const PORT = 3015;
  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  const clientWs = new WebSocket(`ws://localhost:${PORT}/api/interview/live?sessionId=${session.id}`);

  const rawMessageTypesReceived: string[] = [];

  clientWs.on('message', (data: WebSocket.RawData) => {
    try {
      const msg = JSON.parse(data.toString());
      rawMessageTypesReceived.push(msg.type);
      console.log(`[CLIENT-RECV] Type: "${msg.type}"${msg.sender ? ` | Sender: ${msg.sender}` : ''}${msg.text ? ` | Text: "${msg.text}"` : ''}`);
    } catch (e) {
      // ignore
    }
  });

  console.log('⏳ Waiting 6s for interviewer greeting...');
  await new Promise((r) => setTimeout(r, 6000));

  const wavFilePath = path.join(__dirname, '../speech.wav');
  if (!fs.existsSync(wavFilePath)) {
    console.error('❌ speech.wav not found at:', wavFilePath);
    process.exit(1);
  }

  const wavBuffer = fs.readFileSync(wavFilePath);
  const pcmBuffer = wavBuffer.subarray(44); // strip WAV header

  console.log(`\n🎤 Client streaming real human speech PCM audio (${pcmBuffer.length} bytes)...`);
  const chunkSize = 3200; // 100ms at 16kHz 16-bit mono

  for (let offset = 0; offset < pcmBuffer.length; offset += chunkSize) {
    const chunk = pcmBuffer.subarray(offset, Math.min(offset + chunkSize, pcmBuffer.length));
    clientWs.send(
      JSON.stringify({
        type: 'audio',
        data: chunk.toString('base64'),
        mimeType: 'audio/pcm;rate=16000',
      })
    );
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log('\n💬 Client sending done_answering signal...');
  clientWs.send(
    JSON.stringify({
      type: 'done_answering',
      text: 'I have finished answering Question 1.',
    })
  );

  console.log('⏳ Waiting 8s for interviewer evaluation response...');
  await new Promise((r) => setTimeout(r, 8000));

  clientWs.close();
  server.close();

  console.log('\n======================================================');
  console.log('=== COMPLETE RAW LIST OF MESSAGE TYPES RECEIVED BY CLIENT ===');
  console.log(Array.from(new Set(rawMessageTypesReceived)).join(', '));
  console.log('======================================================\n');

  process.exit(0);
}

runLiveSessionSpeechTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
