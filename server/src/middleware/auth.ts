import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

export interface UserPayload {
  id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
  targetRole?: string | null;
}

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name?: string | null;
      picture?: string | null;
      targetRole?: string | null;
    }
    interface Request {
      user?: User;
    }
  }
}

function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required but not set.');
  }
  return secret;
}

const JWT_SECRET = requireJwtSecret();

export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verifies a raw JWT string and resolves it to a real DB User record (auto-provisioning
 * one if needed). Shared by the Express authenticateJWT middleware and the WebSocket
 * upgrade handler, which can't use middleware since it has no res/next.
 */
export async function verifyAndResolveUser(token: string): Promise<UserPayload> {
  const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;

  // Verify or auto-provision DB User record to guarantee valid PostgreSQL User ID
  try {
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: decoded.id },
          { email: decoded.email },
        ],
      },
    });

    if (!dbUser && decoded.email) {
      dbUser = await prisma.user.create({
        data: {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name || decoded.email.split('@')[0],
          picture: decoded.picture || null,
          targetRole: decoded.targetRole || null,
        },
      });
    }

    if (dbUser) {
      decoded.id = dbUser.id;
      decoded.email = dbUser.email;
      decoded.targetRole = dbUser.targetRole || decoded.targetRole;
    }
  } catch (dbErr) {
    console.warn('⚠️ Non-critical DB user sync check warning in verifyAndResolveUser:', dbErr);
  }

  return decoded;
}

export async function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`🔒 Auth Failure [${req.method} ${req.path}]: Missing or invalid Authorization header.`);
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header format' });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token.trim() === '') {
    console.warn(`🔒 Auth Failure [${req.method} ${req.path}]: Bearer token is empty`);
    return res.status(401).json({ error: 'Unauthorized: Empty Bearer token' });
  }

  try {
    req.user = await verifyAndResolveUser(token);
    next();
  } catch (error: any) {
    console.error(`🔒 Auth Failure [${req.method} ${req.path}]: JWT Verification Error - Name: "${error.name}", Message: "${error.message}"`);

    let clientErrorMessage = 'Unauthorized: Token verification failed';
    if (error.name === 'TokenExpiredError') {
      clientErrorMessage = 'Unauthorized: JWT token has expired. Please sign in again.';
    } else if (error.name === 'JsonWebTokenError') {
      clientErrorMessage = `Unauthorized: Invalid JWT signature or malformed token (${error.message})`;
    }

    return res.status(401).json({ error: clientErrorMessage });
  }
}
