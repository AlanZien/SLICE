import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ?? 3001;
const NODE_ENV = process.env.NODE_ENV ?? 'development';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting: 30 req/min per IP on sensitive endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again in a minute.' },
});

app.use('/api/', apiLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: NODE_ENV, timestamp: new Date().toISOString() });
});

// TODO: POST /api/upload — parse OpenAPI spec, return endpoint list
// TODO: POST /api/generate — generate MCP server code, return ZIP

// In production, serve the built frontend from dist/client
if (NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../client');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`SLICE server running on http://localhost:${PORT} (${NODE_ENV})`);
});
