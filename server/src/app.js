import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import expertRoutes from './routes/expertRoutes.js';
import doubtRoutes from './routes/doubtRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175'
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    }
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'API is healthy' });
});

app.use('/api/auth', authRoutes);
app.use('/api/experts', expertRoutes);
app.use('/api/doubts', doubtRoutes);
app.use('/api/sessions', sessionRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error'
  });
});

export default app;
