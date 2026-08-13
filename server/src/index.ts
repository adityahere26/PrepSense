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

// Create HTTP Server & Attach Live Interview WebSocket
const server = http.createServer(app);
setupLiveInterviewWebSocket(server);

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 PrepSense Server listening on http://localhost:${PORT}`);
  console.log(`🎙️ Live Streaming Interview WebSocket ready on ws://localhost:${PORT}/api/interview/live`);
  console.log(`🔒 Allowed CORS Origin: ${CLIENT_URL}`);
});

