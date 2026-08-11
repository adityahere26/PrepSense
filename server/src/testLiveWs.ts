import dotenv from 'dotenv';
import http from 'http';
import express from 'express';
import WebSocket from 'ws';
import { prisma } from './db.js';
import { setupLiveInterviewWebSocket } from './services/liveInterviewWs.js';

dotenv.config();

/**
 * Creates a synthetic 16kHz PCM audio buffer simulating a candidate's spoken answer out loud.
 */
function generateSampleAudioPCMBuffer(durationSeconds: number = 2, sampleRate: number = 16000): Buffer {
  const numSamples = sampleRate * durationSeconds;
  const buffer = Buffer.alloc(numSamples * 2); // 16-bit PCM = 2 bytes per sample

  const frequency = 440; // 440 Hz tone
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.floor(Math.sin(2 * Math.PI * frequency * t) * 10000);
    buffer.writeInt16LE(sample, i * 2);
  }

  return buffer;
}

async function runLiveInterviewWebSocketTest() {
  console.log('🚀 Starting Gemini Live API WebSocket End-to-End Test...\n');

  // 1. Ensure test user & test InterviewSession exist in DB
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
          {
            order: 2,
            category: 'system_design',
            questionText: 'How would you architect a real-time notification service supporting 100,000 active WebSocket connections?',
          },
          {
            order: 3,
            category: 'behavioral',
            questionText: 'Describe a time when you had to resolve a high-severity production incident under tight deadline pressure.',
          },
        ],
      },
    },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
    },
  });

  console.log(`✅ Created test InterviewSession [${session.id}] with ${session.questions.length} questions.`);

  // 2. Start temporary Express + WebSocket server for testing
  const app = express();
  const server = http.createServer(app);
  setupLiveInterviewWebSocket(server);

  const TEST_PORT = 3008;
  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`📡 Test WebSocket Server running on ws://localhost:${TEST_PORT}/api/interview/live\n`);
      resolve();
    });
  });

  // 3. Connect fake WebSocket client to endpoint
  const wsUrl = `ws://localhost:${TEST_PORT}/api/interview/live?sessionId=${session.id}`;
  console.log(`🔗 Connecting fake client WebSocket to: ${wsUrl}`);
  const clientWs = new WebSocket(wsUrl);

  let totalAudioChunksReceived = 0;
  let totalAudioBytesReceived = 0;
  let fullTranscript = '';
  let question1Asked = false;

  clientWs.on('open', () => {
    console.log('⚡ Fake Client WebSocket connected to server!\n');
  });

  clientWs.on('message', async (data: WebSocket.RawData) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'connected') {
        console.log(`✅ Connection handshake confirmed for Session [${msg.sessionId}] (${msg.questionCount} questions, Role: "${msg.targetRole}")`);
      } else if (msg.type === 'transcript') {
        process.stdout.write(`🗣️ [TRANSCRIPT - ${msg.sender.toUpperCase()}]: ${msg.text}\n`);
        fullTranscript += msg.text;
        if (msg.text.toLowerCase().includes('concurrency') || msg.text.toLowerCase().includes('question') || msg.text.toLowerCase().includes('explain')) {
          question1Asked = true;
        }
      } else if (msg.type === 'audio') {
        totalAudioChunksReceived++;
        const bytes = Math.round((msg.data?.length || 0) * 0.75);
        totalAudioBytesReceived += bytes;
        console.log(`🔊 [AUDIO RECEIVED] Chunk #${totalAudioAudioChunkCountFormat(totalAudioChunksReceived)} (${bytes} bytes, mime: ${msg.mimeType})`);
      } else if (msg.type === 'turn_complete') {
        console.log('🏁 [TURN COMPLETE] AI Interviewer finished speaking current turn.');
      } else if (msg.type === 'error') {
        console.error('❌ [ERROR FROM SERVER]:', msg.message);
      }
    } catch (err) {
      console.warn('⚠️ Non-JSON message received:', data.toString());
    }
  });

  clientWs.on('error', (err) => {
    console.error('❌ WebSocket Client Error:', err);
  });

  clientWs.on('close', (code, reason) => {
    console.log(`🔌 Fake Client WebSocket closed (${code}: ${reason})`);
  });

  // Helper for chunk count formatting
  function totalAudioAudioChunkCountFormat(n: number) {
    return n < 10 ? `0${n}` : `${n}`;
  }

  // 4. Wait for AI to ask Question 1 out loud, then simulate candidate streaming a spoken audio answer!
  console.log('\n⏳ Waiting 5 seconds for Gemini Live AI to speak Question 1...');
  await new Promise((r) => setTimeout(r, 5000));

  console.log('\n🎤 SIMULATING CANDIDATE ANSWER: Streaming audio chunks to WebSocket server...');
  const samplePcmBuffer = generateSampleAudioPCMBuffer(3, 16000); // 3 seconds of 16kHz PCM audio
  const chunkSize = 3200; // 100ms chunks at 16kHz 16-bit mono

  let chunkCount = 0;
  for (let offset = 0; offset < samplePcmBuffer.length; offset += chunkSize) {
    const chunk = samplePcmBuffer.subarray(offset, offset + chunkSize);
    const base64Chunk = chunk.toString('base64');
    
    // Stream audio chunk to WebSocket server
    clientWs.send(
      JSON.stringify({
        type: 'audio',
        data: base64Chunk,
        mimeType: 'audio/pcm;rate=16000',
      })
    );

    chunkCount++;
    await new Promise((r) => setTimeout(r, 50)); // 50ms delay between chunks
  }

  console.log(`✅ Streamed ${chunkCount} audio chunks (${samplePcmBuffer.length} bytes total) simulating candidate answer.`);

  // Send follow-up prompt to simulate candidate finishing answer
  console.log('💬 Sending candidate completion signal to prompt next question...');
  clientWs.send(
    JSON.stringify({
      type: 'text_prompt',
      text: 'I have finished explaining my approach to concurrency and microservices. I am ready for Question 2.',
    })
  );

  // Wait 6 seconds to observe Gemini's live audio/transcript response to candidate's answer
  console.log('\n⏳ Waiting 6 seconds to observe Gemini Live response...');
  await new Promise((r) => setTimeout(r, 6000));

  // 5. Clean up and print test summary
  clientWs.close();
  server.close();

  console.log('\n=================== TEST SUMMARY ===================');
  console.log(`Total Audio Chunks Received from Gemini: ${totalAudioChunksReceived}`);
  console.log(`Total Audio Bytes Received from Gemini:  ${totalAudioBytesReceived} bytes`);
  console.log(`Combined Transcript Received:            "${fullTranscript.trim()}"`);
  console.log(`End-to-End Streaming Bridge Status:       ${totalAudioChunksReceived > 0 && fullTranscript.length > 0 ? '✅ PASSED SUCCESSFUL' : '❌ FAILED'}`);
  console.log('====================================================\n');

  process.exit(0);
}

runLiveInterviewWebSocketTest().catch((err) => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
