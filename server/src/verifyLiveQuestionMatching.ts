import dotenv from 'dotenv';
import http from 'http';
import express from 'express';
import WebSocket from 'ws';
import { prisma } from './db.js';
import { setupLiveInterviewWebSocket } from './services/liveInterviewWs.js';

dotenv.config();

async function verifyLiveQuestionMatching() {
  console.log('🔍 VERIFYING GEMINI LIVE API QUESTION MATCHING AGAINST DATABASE RECORDS...\n');

  // 1. Create a test user and an InterviewSession with specific personalized questions
  let user = await prisma.user.findFirst({
    where: { email: 'verify_matching@prepsense.ai' },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'verify_matching@prepsense.ai',
        name: 'Aditya Test Candidate',
        targetRole: 'Full Stack Engineer',
      },
    });
  }

  const customQuestions = [
    {
      order: 1,
      category: 'technical_depth',
      questionText: 'In your project PrepSense, how did you handle asynchronous file parsing for PDF resumes using pdf-parse without blocking the Express event loop?',
    },
    {
      order: 2,
      category: 'system_architecture',
      questionText: 'You mentioned using Cloudflare R2 for resume storage. What architectural trade-offs led you to choose R2 over AWS S3 or native Postgres bytea storage?',
    },
    {
      order: 3,
      category: 'behavioral',
      questionText: 'Describe a situation during the development of your voice interview feature where a third-party API rate limit forced you to implement a fallback mechanism.',
    },
  ];

  const session = await prisma.interviewSession.create({
    data: {
      userId: user.id,
      targetRole: 'Full Stack Engineer',
      status: 'in_progress',
      questions: {
        create: customQuestions,
      },
    },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
    },
  });

  console.log(`✅ Created InterviewSession [${session.id}] with 3 personalized questions in DB.\n`);

  // 2. Start HTTP & WebSocket server on a dedicated port
  const app = express();
  const server = http.createServer(app);
  setupLiveInterviewWebSocket(server);

  const VERIFY_PORT = 3009;
  await new Promise<void>((resolve) => {
    server.listen(VERIFY_PORT, resolve);
  });

  // 3. Connect fake WebSocket client
  const clientWs = new WebSocket(`ws://localhost:${VERIFY_PORT}/api/interview/live?sessionId=${session.id}`);

  let turns: string[] = [];
  let currentTurn = '';

  clientWs.on('message', (data: WebSocket.RawData) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'transcript' && msg.sender === 'assistant') {
        currentTurn += msg.text;
        process.stdout.write(msg.text);
      } else if (msg.type === 'turn_complete') {
        console.log('\n--- [END OF TURN] ---\n');
        if (currentTurn.trim()) {
          turns.push(currentTurn.trim());
          currentTurn = '';
        }
      }
    } catch (e) {
      // ignore
    }
  });

  await new Promise((r) => setTimeout(r, 1500));

  console.log('⏳ Observing Gemini Live asking Question 1...\n');
  await new Promise((r) => setTimeout(r, 8000));

  if (currentTurn.trim()) {
    turns.push(currentTurn.trim());
    currentTurn = '';
  }

  // Simulate candidate answer to Question 1
  console.log('\n🎤 Candidate sending spoken answer to Question 1...\n');
  clientWs.send(
    JSON.stringify({
      type: 'text_prompt',
      text: 'I used stream buffers and offloaded heavy parsing logic so Express remains non-blocking. I am ready for Question 2.',
    })
  );

  console.log('⏳ Observing Gemini Live asking Question 2...\n');
  await new Promise((r) => setTimeout(r, 8000));

  if (currentTurn.trim()) {
    turns.push(currentTurn.trim());
    currentTurn = '';
  }

  clientWs.close();
  server.close();

  // 4. Fetch actual InterviewQuestion DB records for this sessionId
  const dbQuestions = await prisma.interviewQuestion.findMany({
    where: { sessionId: session.id },
    orderBy: { order: 'asc' },
  });

  console.log('\n===================================================================================================');
  console.log('                         SIDE-BY-SIDE QUESTION COMPARISON VERIFICATION                             ');
  console.log('===================================================================================================\n');

  dbQuestions.forEach((dbQ, idx) => {
    console.log(`--- QUESTION ${dbQ.order} ---`);
    console.log(`📋 DB RECORD QUESTION TEXT : "${dbQ.questionText}"`);
    const liveCaptured = turns[idx] || '[Turn transcript captured]';
    console.log(`🎙️ GEMINI LIVE SPOKEN TEXT : "${liveCaptured}"`);

    const dbWords = dbQ.questionText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const liveLower = liveCaptured.toLowerCase();
    const matchedWords = dbWords.filter(w => liveLower.includes(w));
    const matchRatio = dbWords.length > 0 ? (matchedWords.length / dbWords.length) : 0;
    
    console.log(`🎯 VERBATIM MATCH METRIC   : ${Math.round(matchRatio * 100)}% keyword match`);
    console.log(`📌 VERDICT                 : ${matchRatio > 0.6 ? '✅ MATCHES DB RECORD' : '⚠️ DEVIATION DETECTED'}`);
    console.log('---------------------------------------------------------------------------------------------------\n');
  });

  console.log('===================================================================================================\n');

  process.exit(0);
}

verifyLiveQuestionMatching().catch((err) => {
  console.error('❌ Verification script failed:', err);
  process.exit(1);
});
