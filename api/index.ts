import express from 'express';
import apiRouter from '../server/routes/api.ts';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'healthy',
    app: 'Smart Student Tracker',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Support both /api/* routes and root rewrites on Vercel Serverless
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
