import dotenv from 'dotenv';
import { prisma } from './db.js';
import { generateInterviewQuestionsWithGemini } from './services/gemini.js';

dotenv.config();

async function runRoleComparisonVerification() {
  console.log('========================================================================================');
  console.log('🔬 REAL RESUME INTERVIEW SESSION VERIFICATION & ROLE COMPARISON TEST');
  console.log('========================================================================================\n');

  // 1. Ensure test user & two distinct resumes exist in DB
  let user = await prisma.user.findFirst({
    where: { email: 'verification_comparison_user@prepsense.ai' },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'verification_comparison_user@prepsense.ai',
        name: 'Verification User',
        targetRole: 'Software Engineer',
      },
    });
  }

  // Find or create Resume 1: Software Engineer focused
  const sweParsedData = {
    contact: { name: 'Aditya Sharma', email: 'aditya.swe@example.com' },
    summary: 'Senior Full Stack Developer with experience in React, Node.js microservices, PostgreSQL, and GCP.',
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
        description: 'Voice interview prep application powered by Gemini LLM and audio transcription.',
        technologies: ['React', 'Node.js', 'Gemini API', 'PostgreSQL'],
      },
    ],
  };

  let sweResume = await prisma.resume.findFirst({
    where: { userId: user.id, resumeGroupId: 'res_grp_swe_test' },
  });

  if (!sweResume) {
    sweResume = await prisma.resume.create({
      data: {
        userId: user.id,
        resumeGroupId: 'res_grp_swe_test',
        fileUrl: 'https://r2.prepsense.ai/test_swe_resume.pdf',
        parsedJson: JSON.stringify(sweParsedData),
        version: 1,
      },
    });
  }

  // Find or create Resume 2: Product Manager focused
  const pmParsedData = {
    contact: { name: 'Sarah Jenkins', email: 'sarah.pm@example.com' },
    summary: 'Lead Product Manager specializing in B2B SaaS growth, user engagement metrics, and product strategy.',
    skills: ['Product Strategy', 'Roadmapping', 'SQL', 'Mixpanel', 'A/B Testing', 'Agile/Scrum', 'User Research'],
    workExperience: [
      {
        company: 'Apex SaaS Labs',
        position: 'Senior Product Manager',
        startDate: '2023-03',
        endDate: 'Present',
        description: [
          'Led launch of new self-serve onboarding flow, boosting 30-day user retention by 28%.',
          'Managed product backlog and sprint prioritization for 12 engineers and 2 UI/UX designers.',
        ],
      },
    ],
    projects: [
      {
        title: 'Customer Churn Predictor & Retention Suite',
        description: 'Implemented automated churn triggers increasing annual recurring revenue (ARR) retention by 15%.',
        technologies: ['Mixpanel', 'Amplitude', 'SQL', 'Figma'],
      },
    ],
  };

  let pmResume = await prisma.resume.findFirst({
    where: { userId: user.id, resumeGroupId: 'res_grp_pm_test' },
  });

  if (!pmResume) {
    pmResume = await prisma.resume.create({
      data: {
        userId: user.id,
        resumeGroupId: 'res_grp_pm_test',
        fileUrl: 'https://r2.prepsense.ai/test_pm_resume.pdf',
        parsedJson: JSON.stringify(pmParsedData),
        version: 1,
      },
    });
  }

  console.log(`✅ Database Resumes Ready:`);
  console.log(`   - SWE Resume ID: ${sweResume.id}`);
  console.log(`   - PM Resume ID: ${pmResume.id}\n`);

  // -----------------------------------------------------------------------------------------
  // RUN 1: Target Role = 'Software Engineer'
  // -----------------------------------------------------------------------------------------
  const role1 = 'Software Engineer';
  console.log(`========================================================================================`);
  console.log(`💻 RUN 1: Creating Session for Role: "${role1}" (Resume ID: ${sweResume.id})`);
  console.log(`========================================================================================`);

  const parsedSweJson = JSON.parse(sweResume.parsedJson);
  const result1 = await generateInterviewQuestionsWithGemini(role1, parsedSweJson);

  const sweSession = await prisma.interviewSession.create({
    data: {
      userId: user.id,
      resumeId: sweResume.id,
      targetRole: role1,
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
      questions: { orderBy: { order: 'asc' } },
    },
  });

  console.log(`\n🤖 Engine Used: ${result1.source} (${result1.modelUsed || 'Fallback'})`);
  console.log(`📂 Inferred Categories for "${role1}": [ ${result1.categories.join(', ')} ]`);
  console.log(`❓ Generated Questions (${result1.questions.length}):`);
  result1.questions.forEach((q, i) => {
    console.log(`   ${i + 1}. [${q.category.toUpperCase()}] ${q.questionText}`);
  });

  console.log(`\n💾 DB Persisted Session ID: ${sweSession.id}`);
  console.log(`   - Total Questions Saved: ${sweSession.questions.length}`);
  console.log(`   - Linked Resume ID: ${sweSession.resumeId}`);

  // -----------------------------------------------------------------------------------------
  // RUN 2: Target Role = 'Product Manager'
  // -----------------------------------------------------------------------------------------
  const role2 = 'Product Manager';
  console.log(`\n========================================================================================`);
  console.log(`📊 RUN 2: Creating Session for Role: "${role2}" (Resume ID: ${pmResume.id})`);
  console.log(`========================================================================================`);

  const parsedPmJson = JSON.parse(pmResume.parsedJson);
  const result2 = await generateInterviewQuestionsWithGemini(role2, parsedPmJson);

  const pmSession = await prisma.interviewSession.create({
    data: {
      userId: user.id,
      resumeId: pmResume.id,
      targetRole: role2,
      status: 'in_progress',
      questions: {
        create: result2.questions.map((q, idx) => ({
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

  console.log(`\n🤖 Engine Used: ${result2.source} (${result2.modelUsed || 'Fallback'})`);
  console.log(`📂 Inferred Categories for "${role2}": [ ${result2.categories.join(', ')} ]`);
  console.log(`❓ Generated Questions (${result2.questions.length}):`);
  result2.questions.forEach((q, i) => {
    console.log(`   ${i + 1}. [${q.category.toUpperCase()}] ${q.questionText}`);
  });

  console.log(`\n💾 DB Persisted Session ID: ${pmSession.id}`);
  console.log(`   - Total Questions Saved: ${pmSession.questions.length}`);
  console.log(`   - Linked Resume ID: ${pmSession.resumeId}`);

  // -----------------------------------------------------------------------------------------
  // ROLE & QUESTION COMPARISON SUMMARY
  // -----------------------------------------------------------------------------------------
  console.log(`\n========================================================================================`);
  console.log(`🔍 COMPARISON SUMMARY & DISTINCTIVENESS VERIFICATION`);
  console.log(`========================================================================================`);
  console.log(`1. Software Engineer Categories : [ ${result1.categories.join(', ')} ]`);
  console.log(`2. Product Manager Categories   : [ ${result2.categories.join(', ')} ]`);

  const categoriesAreDifferent = JSON.stringify(result1.categories) !== JSON.stringify(result2.categories);
  const questionsAreDifferent = result1.questions[0].questionText !== result2.questions[0].questionText;

  if (categoriesAreDifferent && questionsAreDifferent) {
    console.log('\n✅ VERIFICATION CONFIRMED: Categories and questions are dynamically tailored per role and resume content!');
  } else {
    console.warn('\n⚠️ Warning: Categories or questions appear identical across roles.');
  }

  // Cleanup test database records
  await prisma.interviewQuestion.deleteMany({
    where: { sessionId: { in: [sweSession.id, pmSession.id] } },
  });
  await prisma.interviewSession.deleteMany({
    where: { id: { in: [sweSession.id, pmSession.id] } },
  });
  console.log('\n🧹 Cleaned up temporary test sessions and questions from database.');
  console.log(`========================================================================================`);
}

runRoleComparisonVerification().catch(console.error);
