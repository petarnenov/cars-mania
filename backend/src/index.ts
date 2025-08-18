import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { useCookies } from './middleware/auth';
import authRouter from './routes/auth';
import carsRouter from './routes/cars';
import uploadsRouter from './routes/uploads';
import messagingRouter from './routes/messaging';
import testRouter from './routes/test';
import path from 'path';
import expressStatic from 'express';

const app = express();
app.use(cors());
app.use(express.json());
app.use(useCookies());

app.use('/auth', authRouter);
app.use('/cars', carsRouter);
app.use('/uploads', expressStatic.static(path.join(process.cwd(), 'uploads')));
app.use('/upload', uploadsRouter);
app.use('/', messagingRouter);
// test-only helper routes (used by e2e environment)
if (process.env.NODE_ENV !== 'production') {
  app.use('/test', testRouter);
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(env.port, () => {
  console.log(`API listening on :${env.port}`);
});
