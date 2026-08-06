import { Router, Request, Response } from 'express';
import passport from '../config/passport.js';
import { authenticateJWT, generateToken, UserPayload } from '../middleware/auth.js';
import { prisma } from '../db.js';

const router = Router();
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// 1. Google OAuth Login route
router.get('/google', (req: Request, res: Response, next) => {
  const clientID = process.env.GOOGLE_CLIENT_ID || '';
  if (!clientID || clientID === 'mock_google_client_id') {
    // If live Google credentials aren't configured, redirect to mock login for seamless dev testing
    return res.redirect('/api/auth/mock-login');
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

// 2. Google OAuth Callback route
router.get('/google/callback', (req: Request, res: Response, next) => {
  passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}/login?error=auth_failed` }, (err: any, user: any) => {
    if (err || !user) {
      return res.redirect(`${CLIENT_URL}/login?error=auth_failed`);
    }

    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      targetRole: user.targetRole,
    };

    const token = generateToken(payload);
    return res.redirect(`${CLIENT_URL}/auth/callback?token=${encodeURIComponent(token)}`);
  })(req, res, next);
});

// 3. Get Current Authenticated User route
router.get('/me', authenticateJWT, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Try fetching fresh data from DB if available
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.id },
      });
      if (dbUser) {
        return res.json({
          user: {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            picture: dbUser.picture,
            targetRole: dbUser.targetRole,
          },
        });
      }
    } catch {
      // Fallback to token payload if DB query fails or in-memory mock user
    }

    return res.json({ user: req.user });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// 4. Mock / Dev Login route (for immediate testing without live Google API credentials)
router.get('/mock-login', async (req: Request, res: Response) => {
  const email = (req.query.email as string) || 'aditya.dev@prepsense.ai';
  const name = (req.query.name as string) || 'Aditya (Dev User)';
  const mockId = 'usr_mock_12345';

  let userPayload: UserPayload = {
    id: mockId,
    email,
    name,
    picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aditya',
    targetRole: 'Software Engineer',
  };

  try {
    // Attempt DB create/upsert if database connection is available
    const dbUser = await prisma.user.upsert({
      where: { email },
      update: { name },
      create: {
        id: mockId,
        email,
        name,
        picture: userPayload.picture,
        targetRole: userPayload.targetRole,
      },
    });
    userPayload = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      picture: dbUser.picture,
      targetRole: dbUser.targetRole,
    };
  } catch {
    // Database fallback if PostgreSQL is not running locally during initial scaffold test
  }

  const token = generateToken(userPayload);

  // If redirect requested or standard web flow, redirect to frontend callback
  if (req.headers.accept?.includes('text/html') || req.query.redirect === 'true') {
    return res.redirect(`${CLIENT_URL}/auth/callback?token=${encodeURIComponent(token)}`);
  }

  return res.json({
    token,
    user: userPayload,
    redirectUrl: `${CLIENT_URL}/auth/callback?token=${encodeURIComponent(token)}`,
  });
});

export default router;
