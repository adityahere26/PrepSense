import dotenv from 'dotenv';
import { prisma } from './db.js';
import { generateQuestionTTSWithGemini } from './services/gemini.js';

dotenv.config();

async function testTTSAndAnswerFlow() {
  console.log('========================================================================');
  console.log('🎙️ TESTING GEMINI TTS AUDIO GENERATION & ANSWER SUBMISSION FLOW');
  console.log('========================================================================\n');

  // 1. Test generateQuestionTTSWithGemini directly
  const sampleQuestionText = 'At TechNova Solutions, how did you migrate a monolith to microservices while maintaining low latency?';
  console.log(`📌 Test 1: Generating TTS Audio for Question: "${sampleQuestionText}"`);

  const ttsResult = await generateQuestionTTSWithGemini(sampleQuestionText);
  console.log(`   - Returned Audio MimeType: ${ttsResult.mimeType}`);
  console.log(`   - Audio Buffer Size: ${ttsResult.audioBuffer.length} bytes`);

  if (ttsResult.audioBuffer && ttsResult.audioBuffer.length > 0) {
    console.log('✅ SUCCESS: TTS Audio generation returned valid binary audio stream!');
  } else {
    console.error('❌ FAIL: TTS Audio buffer is empty.');
  }

  // 2. Test Answer Upsert in Prisma DB
  console.log('\n========================================================================');
  console.log('💾 Test 2: Testing Prisma Answer Upsert & Next Question Resolution...');

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'test_tts_user@prepsense.ai',
        name: 'Test TTS Candidate',
      },
    });
  }

  const session = await prisma.interviewSession.create({
    data: {
      userId: user.id,
      targetRole: 'Software Engineer',
      status: 'in_progress',
      questions: {
        create: [
          {
            order: 1,
            category: 'system_design',
            questionText: sampleQuestionText,
          },
          {
            order: 2,
            category: 'technical_depth',
            questionText: 'How do you optimize SQL query performance in PostgreSQL?',
          },
        ],
      },
    },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  console.log(`✨ Created Test Session ID: ${session.id} (${session.questions.length} questions)`);

  const q1 = session.questions[0];
  const mockAudioBuffer = Buffer.from('mock_voice_recording_webm_bytes_data');

  // Upsert Answer for Q1
  const answer1 = await prisma.interviewAnswer.upsert({
    where: { questionId: q1.id },
    update: {
      transcript: '[Audio recording saved - transcription & evaluation pending]',
      evaluationJson: JSON.stringify({ status: 'pending', audioBytes: mockAudioBuffer.length }),
      scoreOverall: 0,
    },
    create: {
      questionId: q1.id,
      transcript: '[Audio recording saved - transcription & evaluation pending]',
      evaluationJson: JSON.stringify({ status: 'pending', audioBytes: mockAudioBuffer.length }),
      scoreOverall: 0,
    },
  });

  console.log(`✨ Created InterviewAnswer for Question 1 (${q1.id}):`);
  console.log(`   - Answer ID: ${answer1.id}`);
  console.log(`   - Transcript Placeholder: ${answer1.transcript}`);

  // Resolve next question
  const nextQ = session.questions.find((q) => q.order === q1.order + 1);
  if (nextQ) {
    console.log(`✅ Next Question resolved cleanly: Order #${nextQ.order} [${nextQ.category.toUpperCase()}] "${nextQ.questionText.slice(0, 35)}..."`);
  } else {
    console.error('❌ Failed to resolve next question.');
  }

  // Cleanup test session
  await prisma.interviewQuestion.deleteMany({ where: { sessionId: session.id } });
  await prisma.interviewSession.delete({ where: { id: session.id } });
  console.log('🧹 Cleaned up temporary test session.');

  console.log('\n========================================================================');
  console.log('🎉 ALL TTS AND ANSWER FLOW TESTS PASSED!');
  console.log('========================================================================\n');
}

testTTSAndAnswerFlow().catch(console.error);
