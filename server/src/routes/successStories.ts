import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// POST /api/success-stories (Authenticated only, creates with approved=false)
router.post('/', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User authentication required' });
    }

    const { authorName, roleAchieved, content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required and must not be empty' });
    }

    if (content.trim().length > 500) {
      return res.status(400).json({ error: 'Content exceeds maximum limit of 500 characters' });
    }

    const resolvedAuthorName =
      authorName && typeof authorName === 'string' && authorName.trim().length > 0
        ? authorName.trim()
        : user.name || user.email || 'Anonymous Candidate';

    const resolvedRoleAchieved =
      roleAchieved && typeof roleAchieved === 'string' && roleAchieved.trim().length > 0
        ? roleAchieved.trim()
        : null;

    const newStory = await prisma.successStory.create({
      data: {
        userId: user.id,
        authorName: resolvedAuthorName,
        roleAchieved: resolvedRoleAchieved,
        content: content.trim(),
        approved: false,
      },
    });

    return res.status(201).json({
      success: true,
      story: newStory,
      message: 'Your success story has been submitted and is pending review!',
    });
  } catch (error) {
    console.error('Error creating success story:', error);
    return res.status(500).json({ error: 'Internal server error while submitting success story' });
  }
});

// GET /api/success-stories (Public, returns approved=true stories ordered by newest first)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const stories = await prisma.successStory.findMany({
      where: { approved: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        authorName: true,
        roleAchieved: true,
        content: true,
        createdAt: true,
      },
    });

    return res.json({
      success: true,
      stories,
    });
  } catch (error) {
    console.error('Error fetching success stories:', error);
    return res.status(500).json({ error: 'Internal server error while fetching success stories' });
  }
});

export default router;
