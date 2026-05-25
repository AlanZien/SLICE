import { createApp } from './app';

const PORT = Number(process.env.PORT ?? 3001);
const NODE_ENV = process.env.NODE_ENV ?? 'development';

const app = createApp({ nodeEnv: NODE_ENV });

app.listen(PORT, () => {
  console.log(`SLICE server running on http://localhost:${PORT} (${NODE_ENV})`);
});
