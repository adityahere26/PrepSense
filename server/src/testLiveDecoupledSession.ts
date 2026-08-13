import dotenv from 'dotenv';
import http from 'http';
import express from 'express';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './db.js';
import { setupLiveInterviewWebSocket } from './services/liveInterviewWs.js';
import interviewRoutes from './routes/interview.js';

dotenv.config();

const wavFilePath = path.resolve(process.cwd(), 'speech_3s.wav');

async function runDecoupledLiveSessionTest() {
  console.log('🧪 TESTING END-TO-END DECOUPLED LIVE INTERVIEW & CHUNK TRANSCRIPTION...\n');

  let user = await prisma.user.findFirst({
    where: { email: 'decoupled_test_user@prepsense.ai' },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'decoupled_test_user@prepsense.ai',
        name: 'Decoupled Test Candidate',
        targetRole: 'Senior Full Stack Engineer',
      },
    });
  }

  const session = await prisma.interviewSession.create({
    data: {
      userId: user.id,
      targetRole: 'Senior Full Stack Engineer',
      status: 'in_progress',
      questions: {
        create: [
          {
            order: 1,
            category: 'technical',
            questionText: 'Can you describe your experience with real-time web applications and WebSockets?',
          },
        ],
      },
    },
  });

  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/interview', interviewRoutes);

  const server = http.createServer(app);
  setupLiveInterviewWebSocket(server);

  const PORT = 3018;
  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  const clientWs = new WebSocket(`ws://localhost:${PORT}/api/interview/live?sessionId=${session.id}`);

  const liveTranscripts: Array<{ sender: string; text: string }> = [];

  clientWs.on('message', (data: WebSocket.RawData) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'transcript') {
        console.log(`[LIVE-RECV-TRANSCRIPT] [${msg.sender.toUpperCase()}]: "${msg.text}"`);
        liveTranscripts.push({ sender: msg.sender, text: msg.text });
      }
    } catch (e) {
      // ignore
    }
  });

  console.log('⏳ Waiting 5s for interviewer greeting...');
  await new Promise((r) => setTimeout(r, 5000));

  const wavFilePath = path.join(__dirname, '../speech_3s.wav');
  const wavBuffer = fs.readFileSync(wavFilePath);
  const pcmBuffer = wavBuffer.subarray(44);

  console.log(`\n🎤 Candidate speaking: streaming audio to Live WS and sending 3s chunk to /transcribe-chunk HTTP endpoint...`);
  const chunkSize = 3200; // 100ms chunks for Live WS

  // Stream PCM chunks to WebSocket
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

  // Simultaneously send the ~3-second PCM chunk to HTTP transcription endpoint
  console.log('📡 Sending HTTP POST /api/interview/transcribe-chunk...');
  const httpStartTime = Date.now();
  const httpRes = await fetch(`http://localhost:${PORT}/api/interview/transcribe-chunk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioData: pcmBuffer.toString('base64'),
      mimeType: 'audio/pcm;rate=16000',
    }),
  });

  const httpData: any = await httpRes.json();
  const httpDuration = Date.now() - httpStartTime;
  console.log(`✨ [HTTP-TRANSCRIPTION-RECV] HTTP Transcribed Chunk in ${httpDuration}ms: "${httpData.text}"`);

  if (httpData.text && typeof httpData.text === 'string' && httpData.text.trim()) {
    liveTranscripts.push({ sender: 'user', text: httpData.text.trim() });
  }

  console.log('\n💬 Client sending done_answering signal...');
  clientWs.send(
    JSON.stringify({
      type: 'done_answering',
      text: 'I have finished answering Question 1.',
    })
  );

  console.log('⏳ Waiting 6s for interviewer response...');
  await new Promise((r) => setTimeout(r, 6000));

  clientWs.close();
  server.close();

  console.log('\n======================================================');
  console.log('=== FINAL LIVE TRANSCRIPT LOG IN UI ===');
  liveTranscripts.forEach((t, i) => {
    console.log(` ${i + 1}. [${t.sender.toUpperCase()}]: "${t.text}"`);
  });
  console.log('======================================================\n');

  const hasUserTranscript = liveTranscripts.some((t) => t.sender === 'user' && t.text.length > 0);
  const hasAssistantTranscript = liveTranscripts.some((t) => t.sender === 'assistant' && t.text.length > 0);

  if (hasUserTranscript && hasAssistantTranscript) {
    console.log('✅ TEST PASSED: Decoupled user transcription and assistant Live responses both working!');
    process.exit(0);
  } else {
    console.error('❌ TEST FAILED: Missing user or assistant transcript in log');
    process.exit(1);
  }
}

runDecoupledLiveSessionTest().catch((err) => {
  console.error('❌ Test error:', err);
  process.exit(1);
});
