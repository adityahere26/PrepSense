import { Router, Request, Response } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { prisma } from '../db.js';
import { authenticateJWT } from '../middleware/auth.js';
import { uploadToR2, getR2SignedUrl, getBufferFromR2 } from '../services/r2.js';
import { extractTextFromFile } from '../services/parser.js';
import { parseResumeWithGemini, analyzeResumeWithGemini } from '../services/gemini.js';
import { checkFormatCompatibility } from '../services/formatChecker.js';

const router = Router();

// Configure Multer in-memory storage for handling file uploads (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    const isPdfOrDoc = allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(pdf|docx|doc)$/i);

    if (isPdfOrDoc) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload a PDF (.pdf) or Word document (.docx).'));
    }
  },
});

/**
 * POST /api/resume/upload
 * Accepts multipart form with targetRole (string), optional resumeGroupId (string), and resume (file)
 * Creates a new Resume version record in Postgres via Prisma.
 */
router.post('/upload', authenticateJWT, (req: Request, res: Response) => {
  upload.single('resume')(req, res, async (err: any) => {
    if (err) {
      const message = err instanceof multer.MulterError ? `Upload error: ${err.message}` : err.message;
      return res.status(400).json({ error: message });
    }

    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: User not found in session' });
      }

      const { targetRole, resumeGroupId } = req.body;
      if (!targetRole || typeof targetRole !== 'string' || !targetRole.trim()) {
        return res.status(400).json({ error: 'Target role/field is required (e.g. Software Engineer, Product Manager).' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Resume file is required. Please upload a PDF or DOCX file.' });
      }

      const trimmedRole = targetRole.trim();

      // 1. Save targetRole on User record in Prisma (using upsert for safety)
      await prisma.user.upsert({
        where: { id: userId },
        update: { targetRole: trimmedRole },
        create: {
          id: userId,
          email: req.user?.email || `user_${userId}@prepsense.ai`,
          name: req.user?.name || 'Candidate',
          targetRole: trimmedRole,
        },
      });

      // 2. Determine resumeGroupId and version increment
      let targetGroupId = resumeGroupId && typeof resumeGroupId === 'string' && resumeGroupId.trim() ? resumeGroupId.trim() : '';
      let nextVersion = 1;

      if (targetGroupId) {
        const lastInGroup = await prisma.resume.findFirst({
          where: { userId, resumeGroupId: targetGroupId },
          orderBy: { version: 'desc' },
        });
        nextVersion = (lastInGroup?.version || 0) + 1;
      } else {
        targetGroupId = 'res_grp_' + randomUUID();
        nextVersion = 1;
      }

      // 3. Upload file buffer to Cloudflare R2
      const rawFileUrl = await uploadToR2(file.buffer, file.originalname, file.mimetype, userId);

      // 4. Extract raw text using pdf-parse or mammoth
      const rawText = await extractTextFromFile(file.buffer, file.mimetype, file.originalname);

      // 5. Send raw text to Gemini API for JSON structured field extraction
      const parsedData = await parseResumeWithGemini(rawText, trimmedRole);

      // 6. Save Resume record in Postgres via Prisma
      const newResume = await prisma.resume.create({
        data: {
          userId,
          resumeGroupId: targetGroupId,
          fileUrl: rawFileUrl,
          parsedJson: JSON.stringify(parsedData),
          version: nextVersion,
        },
      });

      // 7. Generate presigned URL for direct browser viewing
      const presignedFileUrl = await getR2SignedUrl(newResume.fileUrl);

      return res.status(201).json({
        success: true,
        message: `Resume version ${nextVersion} uploaded and parsed successfully!`,
        resume: {
          id: newResume.id,
          resumeGroupId: newResume.resumeGroupId,
          fileUrl: presignedFileUrl,
          targetRole: trimmedRole,
          parsedJson: parsedData,
          version: newResume.version,
          createdAt: newResume.createdAt,
        },
      });
    } catch (error: any) {
      console.error('Error in /api/resume/upload:', error);
      return res.status(500).json({
        error: error.message || 'An error occurred while uploading and parsing your resume. Please try again.',
      });
    }
  });
});

/**
 * GET /api/resume/latest
 * Fetches the user's latest parsed resume record (or latest in a group if query param resumeGroupId provided)
 */
router.get('/latest', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { resumeGroupId } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { targetRole: true },
    });

    const groups = await prisma.resume.groupBy({
      by: ['resumeGroupId'],
      where: { userId },
    });

    const filterWhere: any = { userId };
    if (resumeGroupId && typeof resumeGroupId === 'string') {
      filterWhere.resumeGroupId = resumeGroupId.trim();
    }

    const latestResume = await prisma.resume.findFirst({
      where: filterWhere,
      orderBy: { createdAt: 'desc' },
    });

    if (!latestResume) {
      return res.json({
        success: true,
        resume: null,
        totalResumes: groups.length,
        targetRole: user?.targetRole || null,
      });
    }

    let parsedObj = {};
    try {
      parsedObj = typeof latestResume.parsedJson === 'string' ? JSON.parse(latestResume.parsedJson) : latestResume.parsedJson;
    } catch (e) {
      parsedObj = {};
    }

    const presignedFileUrl = await getR2SignedUrl(latestResume.fileUrl);

    return res.json({
      success: true,
      totalResumes: groups.length,
      resume: {
        id: latestResume.id,
        resumeGroupId: latestResume.resumeGroupId,
        fileUrl: presignedFileUrl,
        targetRole: user?.targetRole || null,
        parsedJson: parsedObj,
        version: latestResume.version,
        createdAt: latestResume.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching latest resume:', error);
    return res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

/**
 * GET /api/resume/stats
 * Computes resume statistics for the authenticated user (distinct resumeGroupId count)
 */
router.get('/stats', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const groups = await prisma.resume.groupBy({
      by: ['resumeGroupId'],
      where: { userId },
    });

    const totalAnalyses = await prisma.analysis.count({
      where: {
        resume: { userId },
      },
    });

    return res.json({
      success: true,
      stats: {
        resumesParsed: groups.length,
        totalAnalyses,
      },
    });
  } catch (error: any) {
    console.error('Error fetching resume stats:', error);
    return res.status(500).json({ error: 'Failed to fetch resume stats' });
  }
});

/**
 * GET /api/resume/group/:resumeGroupId
 * Returns all version records for a given resumeGroupId ordered by version desc
 */
router.get('/group/:resumeGroupId', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { resumeGroupId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const versions = await prisma.resume.findMany({
      where: { userId, resumeGroupId },
      orderBy: { version: 'desc' },
    });

    const formattedVersions = await Promise.all(
      versions.map(async (v) => {
        let parsed = {};
        try {
          parsed = typeof v.parsedJson === 'string' ? JSON.parse(v.parsedJson) : v.parsedJson;
        } catch {
          parsed = {};
        }

        const signedUrl = await getR2SignedUrl(v.fileUrl);

        return {
          id: v.id,
          resumeGroupId: v.resumeGroupId,
          fileUrl: signedUrl,
          parsedJson: parsed,
          version: v.version,
          createdAt: v.createdAt,
        };
      })
    );

    return res.json({
      success: true,
      resumeGroupId,
      versions: formattedVersions,
    });
  } catch (error: any) {
    console.error('Error fetching resume group versions:', error);
    return res.status(500).json({ error: 'Failed to fetch resume group history' });
  }
});

/**
 * POST /api/resume/:id/analyze
 * Body: { jdText?: string }
 * Analyzes resume:
 * 1. Executes Gemini AI content quality evaluation (aiQualityScore)
 * 2. Executes deterministic, rule-based Format Compatibility Checks (scanned PDF, images, tables, multi-column, missing sections)
 * Stores result in Analysis model linked to Resume via Prisma.
 */
router.post('/:id/analyze', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const resumeId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { jdText } = req.body;

    // 1. Retrieve resume & user
    const resumeRecord = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
    });

    if (!resumeRecord) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { targetRole: true },
    });

    let parsedResumeJson = {};
    try {
      parsedResumeJson = typeof resumeRecord.parsedJson === 'string' ? JSON.parse(resumeRecord.parsedJson) : resumeRecord.parsedJson;
    } catch (e) {
      parsedResumeJson = {};
    }

    const targetRole = user?.targetRole || 'Professional Candidate';

    // 2. Fetch raw file buffer for deterministic rule checks
    const fileBuffer = await getBufferFromR2(resumeRecord.fileUrl);
    const isDocx = resumeRecord.fileUrl.endsWith('.docx') || resumeRecord.fileUrl.endsWith('.doc');
    const mimetype = isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf';

    // 3. Perform deterministic Format Compatibility Checks (Rule-based, NO AI)
    const formatChecks = await checkFormatCompatibility(fileBuffer || Buffer.from(''), mimetype, parsedResumeJson);

    // 4. Perform AI Content Quality Analysis via Gemini
    const analysisResult = await analyzeResumeWithGemini(parsedResumeJson, targetRole, jdText);

    // 5. Save Analysis record in Prisma
    const newAnalysis = await prisma.analysis.create({
      data: {
        resumeId: resumeRecord.id,
        jdText: jdText && typeof jdText === 'string' && jdText.trim() ? jdText.trim() : null,
        aiQualityScore: analysisResult.aiQualityScore,
        matchScore: analysisResult.matchScore,
        feedbackJson: JSON.stringify(analysisResult),
        formatCompatibility: JSON.stringify(formatChecks),
      },
    });

    return res.status(201).json({
      success: true,
      analysis: {
        id: newAnalysis.id,
        resumeId: newAnalysis.resumeId,
        jdText: newAnalysis.jdText,
        aiQualityScore: newAnalysis.aiQualityScore,
        matchScore: newAnalysis.matchScore,
        feedbackJson: analysisResult,
        formatCompatibility: formatChecks,
        createdAt: newAnalysis.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/resume/:id/analyze:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate resume analysis' });
  }
});

/**
 * GET /api/resume/:id/analysis/latest
 * Returns the most recent Analysis record for a specific resume
 */
router.get('/:id/analysis/latest', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const resumeId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const resumeRecord = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
    });

    if (!resumeRecord) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const latestAnalysis = await prisma.analysis.findFirst({
      where: { resumeId: resumeRecord.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestAnalysis) {
      return res.json({
        success: true,
        analysis: null,
      });
    }

    let parsedFeedback = {};
    try {
      parsedFeedback = typeof latestAnalysis.feedbackJson === 'string' ? JSON.parse(latestAnalysis.feedbackJson) : latestAnalysis.feedbackJson;
    } catch (e) {
      parsedFeedback = {};
    }

    let parsedFormatComp = [];
    try {
      parsedFormatComp = typeof latestAnalysis.formatCompatibility === 'string' ? JSON.parse(latestAnalysis.formatCompatibility) : latestAnalysis.formatCompatibility;
    } catch (e) {
      parsedFormatComp = [];
    }

    return res.json({
      success: true,
      analysis: {
        id: latestAnalysis.id,
        resumeId: latestAnalysis.resumeId,
        jdText: latestAnalysis.jdText,
        aiQualityScore: latestAnalysis.aiQualityScore,
        matchScore: latestAnalysis.matchScore,
        feedbackJson: parsedFeedback,
        formatCompatibility: parsedFormatComp,
        createdAt: latestAnalysis.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/resume/:id/analysis/latest:', error);
    return res.status(500).json({ error: 'Failed to fetch resume analysis' });
  }
});

/**
 * GET /api/resume/:id/file
 * Redirects or serves the presigned resume file for direct browser opening
 */
router.get('/:id/file', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const resumeId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const resumeRecord = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
    });

    if (!resumeRecord) {
      return res.status(404).json({ error: 'Resume file not found' });
    }

    const presignedFileUrl = await getR2SignedUrl(resumeRecord.fileUrl);
    return res.redirect(presignedFileUrl);
  } catch (error: any) {
    console.error('Error serving resume file:', error);
    return res.status(500).json({ error: 'Could not generate download link for resume file' });
  }
});

/**
 * GET /api/resume
 * Returns distinct resumes (latest version of each resumeGroupId) for the authenticated user
 */
router.get('/', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { targetRole: true },
    });

    const groups = await prisma.resume.groupBy({
      by: ['resumeGroupId'],
      where: { userId },
    });

    const distinctResumes = await Promise.all(
      groups.map(async (g) => {
        const latestInGroup = await prisma.resume.findFirst({
          where: { userId, resumeGroupId: g.resumeGroupId },
          orderBy: { version: 'desc' },
        });

        const totalVersions = await prisma.resume.count({
          where: { userId, resumeGroupId: g.resumeGroupId },
        });

        const signedUrl = latestInGroup ? await getR2SignedUrl(latestInGroup.fileUrl) : '';
        let parsed = {};
        try {
          parsed = latestInGroup?.parsedJson ? JSON.parse(latestInGroup.parsedJson) : {};
        } catch (e) {
          parsed = {};
        }

        return {
          id: latestInGroup?.id,
          resumeGroupId: g.resumeGroupId,
          fileUrl: signedUrl,
          targetRole: user?.targetRole || null,
          parsedJson: parsed,
          version: latestInGroup?.version || 1,
          totalVersions,
          createdAt: latestInGroup?.createdAt,
        };
      })
    );

    distinctResumes.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return res.json({
      success: true,
      resumes: distinctResumes,
    });
  } catch (error: any) {
    console.error('Error fetching user resumes:', error);
    return res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

export default router;
