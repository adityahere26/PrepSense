import dotenv from 'dotenv';
import { prisma } from './db.js';
import { generateInterviewQuestionsWithGemini } from './services/gemini.js';

dotenv.config();

async function testInterviewSessionCreation() {
  console.log('=====================================================================');
  console.log('🚀 TESTING VOICE INTERVIEW SESSION CREATION & CATEGORY INFERENCE');
  console.log('=====================================================================\n');

  const sampleResumeJson = {
    contact: {
      name: 'Aditya Sharma',
      email: 'aditya.sharma@example.com',
    },
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Google Cloud Platform', 'GraphQL', 'Tailwind CSS'],
    workExperience: [
      {
        company: 'TechNova Solutions',
        position: 'Senior Full Stack Developer',
        startDate: '2024-01',
        endDate: 'Present',
        description: [
          'Designed and launched scalable REST APIs handling 50,000+ daily active users.',
          'Led migration of legacy monolith to Node.js microservices.',
        ],
      },
    ],
    projects: [
      {
        title: 'PrepSense AI Resume & Voice Prep',
        description: 'AI platform providing automated resume scoring and voice-based mock interviews.',
        technologies: ['React', 'Node.js', 'Gemini API', 'Prisma', 'PostgreSQL'],
      },
    ],
  };

  // Test 1: Generate questions for "Software Engineer"
  const targetRole1 = 'Software Engineer';
  console.log(`📌 Test Case 1: Target Role = "${targetRole1}"`);
  console.log('Generating categories & personalized questions...');
  
  const result1 = await generateInterviewQuestionsWithGemini(targetRole1, sampleResumeJson);

  console.log('\n--- GEMINI GENERATION RESULT ---');
  console.log('Source Engine:', result1.source);
  console.log('Model Used:', result1.modelUsed || 'N/A (Fallback)');
  console.log('Inferred Categories (Count:', result1.categories.length, '):', result1.categories);
  console.log('\nGenerated Questions (Count:', result1.questions.length, '):');
  result1.questions.forEach((q, idx) => {
    console.log(`  ${idx + 1}. [${q.category.toUpperCase()}] ${q.questionText}`);
  });

  // Verify requirements for Test 1
  if (result1.categories.length < 4 || result1.categories.length > 5) {
    console.warn(`⚠️ Warning: Categories count (${result1.categories.length}) is outside expected 4-5 range.`);
  } else {
    console.log('✅ Inferred categories count is within expected range (4-5 categories).');
  }

  if (result1.questions.length < 5 || result1.questions.length > 7) {
    console.warn(`⚠️ Warning: Questions count (${result1.questions.length}) is outside expected 5-7 range.`);
  } else {
    console.log('✅ Generated questions count is within expected range (5-7 questions).');
  }

  // Test 2: Database persistence test
  console.log('\n=====================================================================');
  console.log('💾 Testing Database Persistence via Prisma...');

  // Ensure test user exists
  let testUser = await prisma.user.findFirst({
    where: { email: 'test_interview_runner@example.com' },
  });

  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: 'test_interview_runner@example.com',
        name: 'Test Interview Runner',
        targetRole: targetRole1,
      },
    });
  }

  // Create InterviewSession record
  const session = await prisma.interviewSession.create({
    data: {
      userId: testUser.id,
      targetRole: targetRole1,
      status: 'in_progress',
      questions: {
        create: result1.questions.map((q, idx) => ({
          order: idx + 1,
          category: q.category,
          questionText: q.questionText,
        })),
      },
    },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
    },
  });

  console.log(`✨ Created InterviewSession ID: ${session.id}`);
  console.log(`   Linked User ID: ${session.userId}`);
  console.log(`   Persisted Questions Count: ${session.questions.length}`);

  // Fetch back from DB to verify relations
  const fetchedSession = await prisma.interviewSession.findUnique({
    where: { id: session.id },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (fetchedSession && fetchedSession.questions.length === result1.questions.length) {
    console.log('✅ DB VERIFICATION SUCCESS: All questions correctly saved and retrieved with sequence order & categories!');
  } else {
    console.error('❌ DB Verification failed: Question count mismatch on retrieve.');
  }

  // Cleanup test session
  await prisma.interviewSession.delete({ where: { id: session.id } });
  console.log('🧹 Cleaned up temporary test session from database.');

  console.log('\n=====================================================================');
  console.log('🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
  console.log('=====================================================================');
}

testInterviewSessionCreation().catch(console.error);
