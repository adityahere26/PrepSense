import dotenv from 'dotenv';
import { prisma } from './db.js';
import { evaluateInterviewAnswerWithGemini, generateSessionSummaryWithGemini } from './services/gemini.js';

dotenv.config();

async function runAnswerEvaluationTest() {
  console.log('🧪 TESTING GEMINI ANSWER EVALUATION & SESSION SUMMARY SYNTHESIS...\n');

  let user = await prisma.user.findFirst({
    where: { email: 'eval_test_user@prepsense.ai' },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'eval_test_user@prepsense.ai',
        name: 'Evaluation Test Candidate',
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
          {
            order: 2,
            category: 'system_design',
            questionText: 'How do you ensure state management and data synchronization across multiple connected clients?',
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

  console.log(`✅ Created test session [${session.id}] with ${session.questions.length} questions.`);

  const sampleAnswers = [
    'In my previous project, I built a real-time collaborative dashboard using Node.js, Express, and WebSockets (ws library). We handled over 5,000 concurrent socket connections with low latency, reducing server polling overhead by 60%.',
    'I implemented optimistic UI updates coupled with Redis pub/sub for cross-server message broadcasting. We used event versioning and client-side reconciliation to handle race conditions gracefully.',
  ];

  const evaluatedQA: Array<{ questionText: string; transcript: string; evaluation: any }> = [];

  for (let i = 0; i < session.questions.length; i++) {
    const q = session.questions[i];
    const transcript = sampleAnswers[i];

    console.log(`\n📊 Evaluating Question ${q.order}: "${q.questionText}"...`);
    const evaluation = await evaluateInterviewAnswerWithGemini(q.questionText, transcript, session.targetRole);

    console.log(`✨ Scores: STAR=${evaluation.starScore}, Specificity=${evaluation.specificityScore}, Relevance=${evaluation.relevanceScore}, Overall=${evaluation.scoreOverall}`);
    console.log(`💬 Feedback: "${evaluation.feedback}"`);

    const savedAnswer = await prisma.interviewAnswer.create({
      data: {
        questionId: q.id,
        transcript,
        evaluationJson: JSON.stringify(evaluation),
        scoreOverall: evaluation.scoreOverall,
      },
    });

    console.log(`💾 Saved InterviewAnswer record [${savedAnswer.id}] via Prisma.`);
    evaluatedQA.push({
      questionText: q.questionText,
      transcript,
      evaluation,
    });
  }

  console.log('\n🎉 All questions evaluated. Synthesizing Session Summary with Gemini...');
  const summary = await generateSessionSummaryWithGemini(session.targetRole, evaluatedQA);

  console.log('\n======================================================');
  console.log('=== SESSION SUMMARY RESULT ===');
  console.log(`Overall Rating: ${summary.overallScore}/100`);
  console.log(`Avg STAR: ${summary.averageStarScore} | Avg Specificity: ${summary.averageSpecificityScore} | Avg Relevance: ${summary.averageRelevanceScore}`);
  console.log(`Summary Overview: "${summary.summaryText}"`);
  console.log('Top 2 Improvement Areas:');
  summary.topImprovementAreas.forEach((area, idx) => console.log(` ${idx + 1}. ${area}`));
  console.log('======================================================\n');

  await prisma.interviewSession.update({
    where: { id: session.id },
    data: {
      status: 'completed',
      completedAt: new Date(),
      summaryJson: JSON.stringify(summary),
    },
  });

  console.log('✅ TEST PASSED: Gemini answer evaluation, Prisma saving, and session summary synthesis verified successfully!');
  process.exit(0);
}

runAnswerEvaluationTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
