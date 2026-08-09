import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../db.js';
import { authenticateJWT } from '../middleware/auth.js';
import { uploadToR2, getR2SignedUrl } from '../services/r2.js';
import { extractTextFromFile } from '../services/parser.js';
import { parseResumeWithGemini } from '../services/gemini.js';

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
 * Accepts multipart form with targetRole (string) and resume (file)
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

      const { targetRole } = req.body;
      if (!targetRole || typeof targetRole !== 'string' || !targetRole.trim()) {
        return res.status(400).json({ error: 'Target role/field is required (e.g. Software Engineer, Product Manager).' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Resume file is required. Please upload a PDF or DOCX file.' });
      }

      const trimmedRole = targetRole.trim();

      // 1. Save targetRole on User record in Prisma
      await prisma.user.update({
        where: { id: userId },
        data: { targetRole: trimmedRole },
      });

      // 2. Upload file buffer to Cloudflare R2
      const rawFileUrl = await uploadToR2(file.buffer, file.originalname, file.mimetype, userId);

      // 3. Extract raw text using pdf-parse or mammoth
      const rawText = await extractTextFromFile(file.buffer, file.mimetype, file.originalname);

      // 4. Send raw text to Gemini API for JSON structured field extraction
      const parsedData = await parseResumeWithGemini(rawText, trimmedRole);

      // 5. Determine version increment (v1, v2, v3, etc.)
      const lastResume = await prisma.resume.findFirst({
        where: { userId },
        orderBy: { version: 'desc' },
      });
      const nextVersion = (lastResume?.version || 0) + 1;

      // 6. Save Resume record in Postgres via Prisma
      const newResume = await prisma.resume.create({
        data: {
          userId,
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
 * Fetches the user's latest parsed resume record with presigned URL
 */
router.get('/latest', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { targetRole: true },
    });

    const latestResume = await prisma.resume.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestResume) {
      return res.json({
        success: true,
        resume: null,
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
      resume: {
        id: latestResume.id,
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
 * Returns all resumes for the authenticated user with versioning metadata
 */
router.get('/', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const resumes = await prisma.resume.findMany({
      where: { userId },
      orderBy: { version: 'desc' },
    });

    const formattedResumes = await Promise.all(
      resumes.map(async (r) => {
        let parsed = {};
        try {
          parsed = typeof r.parsedJson === 'string' ? JSON.parse(r.parsedJson) : r.parsedJson;
        } catch (e) {
          parsed = {};
        }

        const signedUrl = await getR2SignedUrl(r.fileUrl);

        return {
          id: r.id,
          fileUrl: signedUrl,
          parsedJson: parsed,
          version: r.version,
          createdAt: r.createdAt,
        };
      })
    );

    return res.json({
      success: true,
      resumes: formattedResumes,
    });
  } catch (error: any) {
    console.error('Error listing resumes:', error);
    return res.status(500).json({ error: 'Failed to retrieve resumes' });
  }
});

export default router;
