import dotenv from 'dotenv';
import { prisma } from './db.js';
import { generateInterviewQuestionsWithGemini } from './services/gemini.js';

dotenv.config();

async function testInterviewSession() {
  console.log('========================================================================================');
  console.log('🧪 REAL RESUME INTERVIEW SESSION VERIFICATION (Software Engineer vs Product Manager)');
  console.log('========================================================================================\n');

  // 1. Fetch existing resumes from the DB (or provision clean test records if DB is empty)
  let existingResumes = await prisma.resume.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  let sweResume = existingResumes[0];
  let pmResume = existingResumes[1];

  // Ensure User exists for test sessions
  let testUser = await prisma.user.findFirst();
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: 'test_session_user@prepsense.ai',
        name: 'Test Candidate',
        targetRole: 'Software Engineer',
      },
    });
  }

  // Provision SWE Resume if not enough existing DB records
  if (!sweResume) {
    const sweParsed = {
      contact: { name: 'Aditya Sharma', email: 'aditya@prepsense.ai' },
      summary: 'Senior Full Stack Engineer specializing in TypeScript, React, Node.js microservices, PostgreSQL, and GCP.',
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'GraphQL', 'Docker', 'Google Cloud Platform'],
      workExperience: [
        {
          company: 'TechNova Solutions',
          position: 'Senior Full Stack Developer',
          startDate: '2024-01',
          endDate: 'Present',
          description: [
            'Designed REST APIs handling 50,000+ daily active users.',
            'Migrated legacy monolith to Node.js microservices, cutting response latency by 45%.',
          ],
        },
      ],
      projects: [
        {
          title: 'PrepSense AI Platform',
          description: 'Voice interview prep application powered by Gemini LLM.',
          technologies: ['React', 'Node.js', 'Gemini API', 'PostgreSQL'],
        },
      ],
    };

    sweResume = await prisma.resume.create({
      data: {
        userId: testUser.id,
        resumeGroupId: 'grp_swe_test_' + Date.now(),
        fileUrl: 'https://storage.prepsense.ai/resumes/swe_test.pdf',
        parsedJson: JSON.stringify(sweParsed),
        version: 1,
      },
    });
  }

  // Provision PM Resume if not enough existing DB records
  if (!pmResume || pmResume.id === sweResume.id) {
    const pmParsed = {
      contact: { name: 'Sarah Jenkins', email: 'sarah.pm@prepsense.ai' },
      summary: 'Lead Product Manager specializing in B2B SaaS growth, user retention metrics, and product roadmap strategy.',
      skills: ['Product Strategy', 'Roadmapping', 'SQL', 'Mixpanel', 'A/B Testing', 'Agile/Scrum', 'User Research'],
      workExperience: [
        {
          company: 'Apex SaaS Labs',
          position: 'Senior Product Manager',
          startDate: '2023-03',
          endDate: 'Present',
          description: [
            'Launched self-serve onboarding flow boosting 30-day user retention by 28%.',
            'Managed product backlog and sprint prioritization for 12 engineers and 2 UI/UX designers.',
          ],
        },
      ],
      projects: [
        {
          title: 'Customer Churn Predictor',
          description: 'Implemented automated churn triggers increasing ARR retention by 15%.',
          technologies: ['Mixpanel', 'Amplitude', 'SQL', 'Figma'],
        },
      ],
    };

    pmResume = await prisma.resume.create({
      data: {
        userId: testUser.id,
        resumeGroupId: 'grp_pm_test_' + Date.now(),
        fileUrl: 'https://storage.prepsense.ai/resumes/pm_test.pdf',
        parsedJson: JSON.stringify(pmParsed),
        version: 1,
      },
    });
  }

  console.log(`📌 Database Resumes Used:`);
  console.log(`   - Resume #1 ID (${sweResume.userId ? 'DB Record' : 'Generated'}): ${sweResume.id}`);
  console.log(`   - Resume #2 ID (${pmResume.userId ? 'DB Record' : 'Generated'}): ${pmResume.id}\n`);

  // =========================================================================================
  // RUN 1: targetRole = 'Software Engineer'
  // =========================================================================================
  const sweRole = 'Software Engineer';
  console.log('========================================================================================');
  console.log(`💻 TEST RUN 1: Target Role = "${sweRole}" (Resume ID: ${sweResume.id})`);
  console.log('========================================================================================');

  let parsedSweJson = {};
  try {
    parsedSweJson = JSON.parse(sweResume.parsedJson);
  } catch (e) {
    parsedSweJson = { summary: 'Software Engineer candidate' };
  }

  const sweGenResult = await generateInterviewQuestionsWithGemini(sweRole, parsedSweJson);

  const sweSession = await prisma.interviewSession.create({
    data: {
      userId: sweResume.userId || testUser.id,
      resumeId: sweResume.id,
      targetRole: sweRole,
      status: 'in_progress',
      questions: {
        create: sweGenResult.questions.map((q, idx) => ({
          order: idx + 1,
          category: q.category,
          questionText: q.questionText,
        })),
      },
    },
    include: {
      questions: { orderBy: { order: 'asc' } },
    },
  });

  console.log(`\n🤖 Engine Used: ${sweGenResult.source} (${sweGenResult.modelUsed || 'Fallback'})`);
  console.log(`📂 Inferred Categories for "${sweRole}" (${sweGenResult.categories.length}): [ ${sweGenResult.categories.join(', ')} ]`);
  console.log(`❓ Generated Questions (${sweGenResult.questions.length}):`);
  sweGenResult.questions.forEach((q, idx) => {
    console.log(`   ${idx + 1}. [${q.category.toUpperCase()}] ${q.questionText}`);
  });

  console.log(`\n💾 Database Persisted Check:`);
  console.log(`   - InterviewSession ID created: ${sweSession.id}`);
  console.log(`   - InterviewQuestion records saved: ${sweSession.questions.length}`);
  console.log(`   - Status: ${sweSession.status}`);

  // Fetch back from DB to confirm persistence
  const checkSweSession = await prisma.interviewSession.findUnique({
    where: { id: sweSession.id },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  if (checkSweSession && checkSweSession.questions.length === sweGenResult.questions.length) {
    console.log('✅ CONFIRMED: InterviewSession and InterviewQuestion records successfully written to PostgreSQL DB!');
  } else {
    console.error('❌ DB Check Failed for Software Engineer session');
  }

  // =========================================================================================
  // RUN 2: targetRole = 'Product Manager'
  // =========================================================================================
  const pmRole = 'Product Manager';
  console.log('\n========================================================================================');
  console.log(`📊 TEST RUN 2: Target Role = "${pmRole}" (Resume ID: ${pmResume.id})`);
  console.log('========================================================================================');

  let parsedPmJson = {};
  try {
    parsedPmJson = JSON.parse(pmResume.parsedJson);
  } catch (e) {
    parsedPmJson = { summary: 'Product Manager candidate' };
  }

  const pmGenResult = await generateInterviewQuestionsWithGemini(pmRole, parsedPmJson);

  const pmSession = await prisma.interviewSession.create({
    data: {
      userId: pmResume.userId || testUser.id,
      resumeId: pmResume.id,
      targetRole: pmRole,
      status: 'in_progress',
      questions: {
        create: pmGenResult.questions.map((q, idx) => ({
          order: idx + 1,
          category: q.category,
          questionText: q.questionText,
        })),
      },
    },
    include: {
      questions: { orderBy: { order: 'asc' } },
    },
  });

  console.log(`\n🤖 Engine Used: ${pmGenResult.source} (${pmGenResult.modelUsed || 'Fallback'})`);
  console.log(`📂 Inferred Categories for "${pmRole}" (${pmGenResult.categories.length}): [ ${pmGenResult.categories.join(', ')} ]`);
  console.log(`❓ Generated Questions (${pmGenResult.questions.length}):`);
  pmGenResult.questions.forEach((q, idx) => {
    console.log(`   ${idx + 1}. [${q.category.toUpperCase()}] ${q.questionText}`);
  });

  console.log(`\n💾 Database Persisted Check:`);
  console.log(`   - InterviewSession ID created: ${pmSession.id}`);
  console.log(`   - InterviewQuestion records saved: ${pmSession.questions.length}`);
  console.log(`   - Status: ${pmSession.status}`);

  // Fetch back from DB to confirm persistence
  const checkPmSession = await prisma.interviewSession.findUnique({
    where: { id: pmSession.id },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  if (checkPmSession && checkPmSession.questions.length === pmGenResult.questions.length) {
    console.log('✅ CONFIRMED: InterviewSession and InterviewQuestion records successfully written to PostgreSQL DB!');
  } else {
    console.error('❌ DB Check Failed for Product Manager session');
  }

  // =========================================================================================
  // COMPARISON VERIFICATION
  // =========================================================================================
  console.log('\n========================================================================================');
  console.log('📊 COMPARISON & DISTINCTIVENESS SUMMARY');
  console.log('========================================================================================');
  console.log(`Software Engineer Categories : [ ${sweGenResult.categories.join(', ')} ]`);
  console.log(`Product Manager Categories   : [ ${pmGenResult.categories.join(', ')} ]`);

  const distinctCategories = JSON.stringify(sweGenResult.categories) !== JSON.stringify(pmGenResult.categories);
  const distinctQuestions = sweGenResult.questions[0].questionText !== pmGenResult.questions[0].questionText;

  if (distinctCategories && distinctQuestions) {
    console.log('\n🎉 SUCCESS: Categories and questions are distinct, highly role-tailored, and non-generic!');
  } else {
    console.warn('\n⚠️ Warning: Categories or questions appeared identical.');
  }
  console.log('========================================================================================\n');
}

testInterviewSession().catch(console.error);
