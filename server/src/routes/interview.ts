import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticateJWT } from '../middleware/auth.js';
import { generateInterviewQuestionsWithGemini } from '../services/gemini.js';

const router = Router();

/**
 * POST /api/interview/session (and /sessions)
 * Creates a new interview session given a targetRole and optional resumeId.
 * Prompts Gemini to infer 4-5 categories for targetRole and generate 5-7 personalized questions.
 * Saves InterviewSession and InterviewQuestion records in Postgres via Prisma.
 */
const createSessionHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User not found in session' });
    }

    const { resumeId, targetRole: reqTargetRole } = req.body || {};

    // 1. Resolve targetRole (from request body or fallback to User record's targetRole)
    let targetRole = typeof reqTargetRole === 'string' && reqTargetRole.trim() ? reqTargetRole.trim() : req.user?.targetRole;

    if (!targetRole || typeof targetRole !== 'string' || !targetRole.trim()) {
      return res.status(400).json({
        error: 'Target role is required to start an interview session (e.g. Software Engineer, Product Manager).',
      });
    }

    targetRole = targetRole.trim();

    // 2. Fetch and parse resume if resumeId provided (or locate latest resume for user)
    let resume: any = null;
    let parsedResumeJson: any = null;

    if (resumeId && typeof resumeId === 'string' && resumeId.trim()) {
      resume = await prisma.resume.findFirst({
        where: {
          id: resumeId.trim(),
          userId,
        },
      });

      if (!resume) {
        return res.status(404).json({ error: 'Specified resume not found or access denied.' });
      }
    } else {
      // Fallback: look up user's most recent uploaded resume
      resume = await prisma.resume.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (resume?.parsedJson) {
      try {
        parsedResumeJson = typeof resume.parsedJson === 'string' ? JSON.parse(resume.parsedJson) : resume.parsedJson;
      } catch (parseErr) {
        console.warn('⚠️ Warning: Failed to parse resume parsedJson stored in DB:', parseErr);
      }
    }

    // 3. Call Gemini to infer categories and generate personalized questions
    console.log(`🎙️ Generating interview session questions for role "${targetRole}" (Resume ID: ${resume?.id || 'None'})...`);
    const result = await generateInterviewQuestionsWithGemini(targetRole, parsedResumeJson);

    // 4. Save InterviewSession and InterviewQuestion records in Postgres via Prisma
    const session = await prisma.interviewSession.create({
      data: {
        userId,
        resumeId: resume?.id || null,
        targetRole,
        status: 'in_progress',
        questions: {
          create: result.questions.map((q, index) => ({
            order: index + 1,
            category: q.category,
            questionText: q.questionText,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
        resume: {
          select: {
            id: true,
            resumeGroupId: true,
            version: true,
          },
        },
      },
    });

    console.log(`✅ Created InterviewSession [${session.id}] with ${session.questions.length} questions across ${result.categories.length} categories.`);

    return res.status(201).json({
      success: true,
      session,
      categories: result.categories,
      modelUsed: result.modelUsed,
      source: result.source,
    });
  } catch (error: any) {
    console.error('❌ Error creating interview session:', error);
    return res.status(500).json({ error: error.message || 'Internal server error creating interview session' });
  }
};

router.post('/session', authenticateJWT, createSessionHandler);
router.post('/sessions', authenticateJWT, createSessionHandler);

/**
 * GET /api/interview/session/:id
 * Fetches an interview session with its questions and answers.
 */
router.get('/session/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const session = await prisma.interviewSession.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            answer: true,
          },
        },
        resume: {
          select: {
            id: true,
            resumeGroupId: true,
            version: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    return res.json({
      success: true,
      session,
    });
  } catch (error: any) {
    console.error('❌ Error fetching interview session:', error);
    return res.status(500).json({ error: error.message || 'Internal server error fetching interview session' });
  }
});

/**
 * GET /api/interview/sessions
 * Lists past interview sessions for the logged in user.
 */
router.get('/sessions', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sessions = await prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            answer: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      sessions,
    });
  } catch (error: any) {
    console.error('❌ Error listing interview sessions:', error);
    return res.status(500).json({ error: error.message || 'Internal server error listing interview sessions' });
  }
});

export default router;
