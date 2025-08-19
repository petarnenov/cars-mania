import express from 'express';
import cors from 'cors';
import path from 'path';
import expressStatic from 'express';
import { useCookies } from './middleware/auth';
import authRouter from './routes/auth';
import carsRouter from './routes/cars';
import uploadsRouter from './routes/uploads';
import messagingRouter from './routes/messaging';
import testRouter from './routes/test';

const app = express();
app.use(cors());
app.use(express.json());
app.use(useCookies());

app.use('/api/auth', authRouter);
app.use('/api/cars', carsRouter);
app.use('/api/uploads', expressStatic.static(path.join(process.cwd(), 'uploads')));
app.use('/api/upload', uploadsRouter);
app.use('/api', messagingRouter);

// test-only helper routes (used by e2e environment)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/test', testRouter);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

export default app;


