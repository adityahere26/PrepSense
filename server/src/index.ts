import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from './config/passport.js';
import authRoutes from './routes/auth.js';
import successStoriesRoutes from './routes/successStories.js';
import resourceRoutes from './routes/resources.js';

import resumeRoutes from './routes/resume.js';
import interviewRoutes from './routes/interview.js';
import { setupLiveInterviewWebSocket } from './services/liveInterviewWs.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Trust the first proxy hop (Railway/Render/etc. sit in front of the app) so
// req.ip and req.secure reflect the real client, not the proxy.
app.set('trust proxy', 1);

// Don't advertise the framework in responses.
app.disable('x-powered-by');

// 1. CORS configuration - allow specified client origin with credentials
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 2. Body parsing middleware (allow 10mb limit for base64 audio chunk transcription)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 3. Initialize Passport middleware
app.use(passport.initialize());

// 4. Routes
app.use('/api/auth', authRoutes);
app.use('/api/success-stories', successStoriesRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/interview', interviewRoutes);

// Health Check Endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'PrepSense Server API',
    timestamp: new Date().toISOString(),
  });
});

// 5. 404 handler for unmatched routes (JSON, not Express's default HTML page)
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 6. Global error handler - catches anything a route didn't try/catch itself
// (e.g. malformed JSON bodies from express.json()) and always returns JSON,
// never a stack trace or internal file paths, regardless of NODE_ENV.
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`❌ Unhandled error [${req.method} ${req.path}]:`, err);
  const status = err.status || err.statusCode || 500;
  const message = status === 400 && err.type === 'entity.parse.failed' ? 'Invalid JSON in request body' : 'Internal server error';
  res.status(status).json({ error: message });
});

// Create HTTP Server & Attach Live Interview WebSocket
const server = http.createServer(app);
setupLiveInterviewWebSocket(server);

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 PrepSense Server listening on http://localhost:${PORT}`);
  console.log(`🎙️ Live Streaming Interview WebSocket ready on ws://localhost:${PORT}/api/interview/live`);
  console.log(`🔒 Allowed CORS Origin: ${CLIENT_URL}`);
});

