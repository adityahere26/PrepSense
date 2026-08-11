import dotenv from 'dotenv';
import http from 'http';
import express from 'express';
import WebSocket from 'ws';
import { prisma } from './db.js';
import { setupLiveInterviewWebSocket } from './services/liveInterviewWs.js';

dotenv.config();

function generateSampleAudioPCMBuffer(durationSeconds: number = 2, sampleRate: number = 16000): Buffer {
  const numSamples = sampleRate * durationSeconds;
  const buffer = Buffer.alloc(numSamples * 2);
  const frequency = 440;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.floor(Math.sin(2 * Math.PI * frequency * t) * 10000);
    buffer.writeInt16LE(sample, i * 2);
  }
  return buffer;
}

async function testUserAudioTranscription() {
  console.log('🧪 TESTING GEMINI LIVE API USER AUDIO TRANSCRIPTION & DONE ANSWERING...\n');

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

  const PORT = 3012;
  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  const clientWs = new WebSocket(`ws://localhost:${PORT}/api/interview/live?sessionId=${session.id}`);

  const receivedMessageTypes: string[] = [];

  clientWs.on('message', (data: WebSocket.RawData) => {
    try {
      const msg = JSON.parse(data.toString());
      receivedMessageTypes.push(msg.type);
      if (msg.type === 'transcript') {
        console.log(`[CLIENT RECV TRANSCRIPT - ${msg.sender.toUpperCase()}]: "${msg.text}"`);
      } else if (msg.type === 'turn_complete') {
        console.log(`[CLIENT RECV TURN_COMPLETE]`);
      }
    } catch (e) {
      // ignore
    }
  });

  console.log('⏳ Waiting 5s for interviewer greeting...');
  await new Promise((r) => setTimeout(r, 5000));

  console.log('\n🎤 Client streaming 3s PCM audio...');
  const sampleBuffer = generateSampleAudioPCMBuffer(3, 16000);
  const chunkSize = 3200;

  for (let offset = 0; offset < sampleBuffer.length; offset += chunkSize) {
    const chunk = sampleBuffer.subarray(offset, offset + chunkSize);
    clientWs.send(
      JSON.stringify({
        type: 'audio',
        data: chunk.toString('base64'),
        mimeType: 'audio/pcm;rate=16000',
      })
    );
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log('\n💬 Client sending done_answering signal...');
  clientWs.send(
    JSON.stringify({
      type: 'done_answering',
      text: 'I have finished answering Question 1.',
    })
  );

  console.log('⏳ Waiting 6s for response to done_answering...');
  await new Promise((r) => setTimeout(r, 6000));

  clientWs.close();
  server.close();

  console.log('\n--- MESSAGE TYPES RECEIVED BY CLIENT ---');
  console.log(Array.from(new Set(receivedMessageTypes)).join(', '));
  console.log('----------------------------------------\n');

  process.exit(0);
}

testUserAudioTranscription().catch(console.error);
