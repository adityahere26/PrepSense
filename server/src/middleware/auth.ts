import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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

const JWT_SECRET = process.env.JWT_SECRET || 'prepsense_dev_jwt_secret_key_12345';

export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`🔒 Auth Failure [${req.method} ${req.path}]: Missing or invalid Authorization header. Header value:`, authHeader || '(none)');
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header format' });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token.trim() === '') {
    console.warn(`🔒 Auth Failure [${req.method} ${req.path}]: Bearer token is empty`);
    return res.status(401).json({ error: 'Unauthorized: Empty Bearer token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    req.user = decoded;
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
