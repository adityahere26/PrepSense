import { Request, Response } from 'express';
import rateLimit, { MemoryStore } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { Redis } from '@upstash/redis';

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redisClient: Redis | null = null;
if (upstashUrl && upstashToken) {
  try {
    redisClient = new Redis({
      url: upstashUrl,
      token: upstashToken,
    });
    console.log('⚡ Upstash Redis client initialized for Rate Limiting.');
  } catch (err) {
    console.warn('⚠️ Error initializing Upstash Redis client, using MemoryStore:', err);
  }
} else {
  console.log('ℹ️ UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not configured. Using MemoryStore for rate limiting.');
}

/**
 * Creates a unique Store instance per rate limiter instance to avoid ERR_ERL_STORE_REUSE
 */
const createLimiterStore = (prefix: string) => {
  if (redisClient) {
    return new RedisStore({
      prefix: `prepsense:${prefix}:`,
      sendCommand: async (...args: string[]) => {
        const command = args[0];
        const commandArgs = args.slice(1);
        return await (redisClient as any).call(command, ...commandArgs);
      },
    });
  }
  return new MemoryStore();
};

/**
 * Custom Key Generator: Key by authenticated User ID if logged in, otherwise by IP address
 */
const keyGenerator = (req: Request): string => {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  return req.ip || 'anonymous';
};

/**
 * 1. Resume Analysis Limiter
 * Cap at 10 requests per user per hour to protect Gemini API free-tier quota
 */
export const resumeAnalysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: createLimiterStore('resume'),
  keyGenerator,
  validate: { default: false },
  handler: (_req: Request, res: Response) => {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded: You have reached the maximum of 10 resume analyses per hour. Please try again later to preserve Gemini API quota.',
    });
  },
});

/**
 * 2. Interview Session Creation Limiter
 * Cap at 10 interview sessions created per user per hour
 */
export const interviewCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: createLimiterStore('interview_session'),
  keyGenerator,
  validate: { default: false },
  handler: (_req: Request, res: Response) => {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded: You have reached the maximum of 10 mock interview sessions per hour. Please try again later.',
    });
  },
});

/**
 * 3. Transcription & Spoken Audio Limiter
 * Cap at 60 spoken answer / transcription chunk calls per user per hour
 */
export const transcriptionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: createLimiterStore('transcription'),
  keyGenerator,
  validate: { default: false },
  handler: (_req: Request, res: Response) => {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded: You have reached the maximum of 60 audio transcriptions per hour. Please wait a bit before submitting more spoken answers.',
    });
  },
});
