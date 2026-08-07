import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from './config/passport.js';
import authRoutes from './routes/auth.js';
import successStoriesRoutes from './routes/successStories.js';
import resourceRoutes from './routes/resources.js';

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

// 2. Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Initialize Passport middleware
app.use(passport.initialize());

// 4. Routes
app.use('/api/auth', authRoutes);
app.use('/api/success-stories', successStoriesRoutes);
app.use('/api/resources', resourceRoutes);

// Health Check Endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'PrepSense Server API',
    timestamp: new Date().toISOString(),
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 PrepSense Server listening on http://localhost:${PORT}`);
  console.log(`🔒 Allowed CORS Origin: ${CLIENT_URL}`);
});
