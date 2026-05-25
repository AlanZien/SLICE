import express, { type Express } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CreateAppOptions {
  nodeEnv?: string;
  clientDist?: string;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Rate limiting: 30 req/min per IP on sensitive endpoints (R1.1.10, R1.4.5)
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again in a minute.' },
  });

  app.use('/api/', apiLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', env: nodeEnv, timestamp: new Date().toISOString() });
  });

  // TODO: POST /api/upload — parsed in phase 02
  // TODO: POST /api/generate — implemented in phase 08

  if (nodeEnv === 'production') {
    const clientDist = options.clientDist ?? path.resolve(__dirname, '../client');
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
