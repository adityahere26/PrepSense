import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';

const router = Router();

// GET /api/resources (List all resources, public access)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const resources = await prisma.resource.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        summary: true,
        createdAt: true,
      },
    });

    return res.json({
      success: true,
      resources,
    });
  } catch (error) {
    console.error('Error fetching resources:', error);
    return res.status(500).json({ error: 'Internal server error while fetching resources' });
  }
});

// GET /api/resources/:slug (Single resource detail by slug, public access)
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { slug },
    });

    if (!resource) {
      return res.status(404).json({ error: 'Resource article not found' });
    }

    return res.json({
      success: true,
      resource,
    });
  } catch (error) {
    console.error('Error fetching resource detail:', error);
    return res.status(500).json({ error: 'Internal server error while fetching resource detail' });
  }
});

export default router;
