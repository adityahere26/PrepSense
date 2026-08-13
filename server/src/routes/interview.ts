import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../db.js';
import { authenticateJWT } from '../middleware/auth.js';
import {
  generateInterviewQuestionsWithGemini,
  generateQuestionTTSWithGemini,
  transcribeAudioChunkWithGemini,
} from '../services/gemini.js';

const router = Router();

// Configure multer for handling in-memory spoken audio uploads (max 25MB)
const uploadAnswerAudio = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

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

/**
 * GET /api/interview/question/:questionId/tts
 * Generates and streams TTS audio for the specified interview question.
 */
router.get('/question/:questionId/tts', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { questionId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const question = await prisma.interviewQuestion.findUnique({
      where: { id: questionId },
      include: {
        session: true,
      },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (question.session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied to question audio' });
    }

    console.log(`🔊 Generating TTS audio for question [${questionId}] ("${question.questionText.slice(0, 40)}...")...`);
    const { audioBuffer, mimeType } = await generateQuestionTTSWithGemini(question.questionText);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(audioBuffer);
  } catch (error: any) {
    console.error('❌ Error rendering TTS audio endpoint:', error);
    return res.status(500).json({ error: 'Failed to generate question TTS audio' });
  }
});

/**
 * POST /api/interview/session/:sessionId/answer
 * Accepts spoken audio answer via multipart/form-data.
 * Saves raw audio, records/upserts InterviewAnswer, and returns next question or completion signal.
 */
router.post('/session/:sessionId/answer', authenticateJWT, (req: Request, res: Response) => {
  uploadAnswerAudio.single('audio')(req, res, async (err: any) => {
    if (err) {
      const message = err instanceof multer.MulterError ? `Audio upload error: ${err.message}` : err.message;
      return res.status(400).json({ error: message });
    }

    try {
      const userId = req.user?.id;
      const { sessionId } = req.params;
      const { questionId } = req.body || {};

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!questionId || typeof questionId !== 'string') {
        return res.status(400).json({ error: 'Question ID (questionId) is required' });
      }

      const session = await prisma.interviewSession.findFirst({
        where: { id: sessionId, userId },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: { answer: true },
          },
        },
      });

      if (!session) {
        return res.status(404).json({ error: 'Interview session not found or access denied' });
      }

      const currentQuestion = session.questions.find((q) => q.id === questionId);
      if (!currentQuestion) {
        return res.status(404).json({ error: 'Question not found in session' });
      }

      const audioBuffer = req.file?.buffer;
      const audioBytes = audioBuffer?.length || 0;

      console.log(`🎙️ Received audio answer for Question [${questionId}] in Session [${sessionId}] (${audioBytes} bytes, ${req.file?.mimetype || 'audio/webm'})`);

      // Upsert InterviewAnswer record in PostgreSQL via Prisma
      const answer = await prisma.interviewAnswer.upsert({
        where: { questionId },
        update: {
          transcript: '[Audio recorded - evaluation pending in next step]',
          evaluationJson: JSON.stringify({
            status: 'pending',
            audioBytes,
            mimeType: req.file?.mimetype || 'audio/webm',
            submittedAt: new Date().toISOString(),
          }),
          scoreOverall: 0,
        },
        create: {
          questionId,
          transcript: '[Audio recorded - evaluation pending in next step]',
          evaluationJson: JSON.stringify({
            status: 'pending',
            audioBytes,
            mimeType: req.file?.mimetype || 'audio/webm',
            submittedAt: new Date().toISOString(),
          }),
          scoreOverall: 0,
        },
      });

      // Find next question in sequence
      const nextQuestion = session.questions.find((q) => q.order === currentQuestion.order + 1);

      if (nextQuestion) {
        return res.json({
          success: true,
          isComplete: false,
          nextQuestion,
          answer,
        });
      } else {
        // All questions completed -> update session status
        await prisma.interviewSession.update({
          where: { id: sessionId },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });

        return res.json({
          success: true,
          isComplete: true,
          nextQuestion: null,
          answer,
          message: 'Interview session completed!',
        });
      }
    } catch (error: any) {
      console.error('❌ Error handling answer submission endpoint:', error);
      return res.status(500).json({ error: error.message || 'Internal server error processing answer' });
    }
  });
});

/**
 * POST /api/interview/transcribe-chunk
 * Decoupled endpoint for transcribing ~3-second PCM audio chunks in near-real-time.
 * Accepts JSON: { audioData: string, mimeType?: string }
 * Returns: { text: string }
 */
router.post('/transcribe-chunk', async (req: Request, res: Response) => {
  try {
    const { audioData, mimeType } = req.body || {};

    if (!audioData || typeof audioData !== 'string') {
      return res.status(400).json({ error: 'Missing required base64 audioData field' });
    }

    const transcribedText = await transcribeAudioChunkWithGemini(
      audioData,
      mimeType || 'audio/pcm;rate=16000'
    );

    return res.json({ text: transcribedText });
  } catch (error: any) {
    console.error('❌ Error in transcribe-chunk endpoint:', error);
    return res.status(500).json({ error: error.message || 'Failed to transcribe audio chunk' });
  }
});

export default router;

