import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { errorHandler } from './middleware/errorHandler.js';
import libraryRoutes from './routes/library.js';
import bookRoutes from './routes/books.js';
import annotationRoutes from './routes/annotations.js';
import { scanLibrary, startFileWatcher } from './services/libraryScanner.js';
import { ensureThumbnailDirs } from './services/thumbnailService.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/library', libraryRoutes);
app.use('/api/books', bookRoutes);
app.use('/api', annotationRoutes);

// Global error handler (must be after routes)
app.use(errorHandler);

// Startup
async function bootstrap() {
  // Ensure cache directories exist
  const cacheDir = path.resolve(process.cwd(), '../cache');
  await fs.mkdir(path.join(cacheDir, 'thumbnails'), { recursive: true });
  await fs.mkdir(path.join(cacheDir, 'covers'), { recursive: true });
  await ensureThumbnailDirs();

  // Run initial library scan
  try {
    console.log('Running initial library scan...');
    const result = await scanLibrary();
    console.log(`Initial scan complete: ${result.total} books (+${result.added} -${result.removed} ~${result.updated})`);
  } catch (err) {
    console.error('Initial scan failed:', err);
  }

  // Start file watcher
  startFileWatcher();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
