import { Router, Request, Response } from 'express';
import passport from '../config/passport.js';
import { authenticateJWT, generateToken, UserPayload } from '../middleware/auth.js';
import { prisma } from '../db.js';

const router = Router();
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// 1. Google OAuth Login route
router.get('/google', (req: Request, res: Response, next) => {
  const clientID = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  if (!clientID || !clientSecret) {
    return res.status(500).json({ error: 'Google OAuth is not configured on this server.' });
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
      // Fallback to token payload if DB query fails
    }

    return res.json({ user: req.user });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
