import express, { type Express } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createUploadRouter } from './routes/upload';
import { createGenerateRouter } from './routes/generate';
import { createGenerateBinaryRouter } from './routes/generate-binary';

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
  // Global JSON parser at 10 MB for the default API. The /api/generate
  // route ships its own 15 MB parser; we skip the global one on that path
  // so the larger limit is the only one applied (R1.6.8).
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/generate') || req.path.startsWith('/api/generate-binary')) return next();
    return express.json({ limit: '10mb' })(req, res, next);
  });

  // Rate limiting: 30 req/min per IP on sensitive endpoints (R1.1.10, R1.4.5)
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again in a minute.' },
  });

  // Health check is exempted from rate limiting so monitoring/CI behind
  // shared NAT can probe freely without exhausting the IP quota.
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, status: 'ok', env: nodeEnv, timestamp: new Date().toISOString() });
  });

  app.use('/api/', apiLimiter);

  // POST /api/upload — phase 02 (multer applies its own 10 MB limit before json parser)
  app.use('/api/upload', createUploadRouter());

  // POST /api/generate-binary — phase 11. MUST be registered before the
  // /api/generate mount: `app.use('/api/generate', ...)` would otherwise
  // match `/api/generate-binary` first (prefix routing), strip the prefix,
  // and forward `/-binary` to the ZIP router — which 404s. Mounting the
  // longer path first lets Express dispatch correctly.
  app.use('/api/generate-binary', createGenerateBinaryRouter());

  // POST /api/generate — phase 08. Mounts its own 15 MB JSON parser; the
  // 10 MB app-level one is bypassed by the path-specific router order.
  app.use('/api/generate', createGenerateRouter());

  if (nodeEnv === 'production') {
    const clientDist = options.clientDist ?? path.resolve(__dirname, '../client');
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
