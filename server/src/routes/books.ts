import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { z } from 'zod';
import multer from 'multer';
import sharp from 'sharp';
import prisma from '../lib/prisma.js';
import { resolveCoverUrl } from '../lib/coverUrl.js';
import { AppError } from '../lib/errors.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { generateThumbnail } from '../services/thumbnailService.js';
import { getBooksDir } from '../services/libraryScanner.js';

const router = Router();

const CACHE_DIR = path.resolve(process.cwd(), '../cache');
const COVERS_DIR = path.join(CACHE_DIR, 'covers');

// Helper to safely extract a route param as string
function param(req: Request, name: string): string {
  const val = req.params[name];
  if (Array.isArray(val)) return val[0];
  return val as string;
}

// Multer config for cover uploads
const upload = multer({
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('VALIDATION_ERROR', 'Only JPG, PNG, and WebP images are allowed'));
    }
  },
  storage: multer.memoryStorage(),
});

// Helper to find a book or throw
async function findBookOrThrow(id: string) {
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) {
    throw new AppError('BOOK_NOT_FOUND', `Book with id ${id} not found`);
  }
  return book;
}

// Helper to validate path is within BOOKS_DIR
function validateFilePath(filePath: string): string {
  const resolved = path.resolve(filePath);
  const booksDir = path.resolve(getBooksDir());
  if (!resolved.startsWith(booksDir)) {
    throw new AppError('PATH_TRAVERSAL', 'Access denied: file is outside the allowed directory');
  }
  return resolved;
}

// GET /api/books/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = await findBookOrThrow(param(req, 'id'));
    const progress = await prisma.readingProgress.findUnique({
      where: { bookId: book.id },
    });

    const percentage =
      progress && book.totalPages
        ? Math.round((progress.currentPage / book.totalPages) * 100)
        : 0;

    res.json({
      id: book.id,
      title: book.title,
      author: book.author,
      description: book.description,
      fileName: book.fileName,
      totalPages: book.totalPages,
      fileSize: Number(book.fileSize),
      coverUrl: resolveCoverUrl(book),
      folder: book.folder,
      isFavorite: book.isFavorite,
      addedAt: book.addedAt.toISOString(),
      year: book.year,
      pdfMetadata: (book.pdfTitle || book.pdfAuthor || book.pdfSubject || book.pdfKeywords || book.pdfCreator || book.pdfProducer || book.pdfCreationDate || book.pdfModDate) ? {
        title: book.pdfTitle,
        author: book.pdfAuthor,
        subject: book.pdfSubject,
        keywords: book.pdfKeywords,
        creator: book.pdfCreator,
        producer: book.pdfProducer,
        creationDate: book.pdfCreationDate,
        modDate: book.pdfModDate,
      } : null,
      progress: progress
        ? {
            currentPage: progress.currentPage,
            percentage,
            isFinished: progress.isFinished,
            lastReadAt: progress.lastReadAt.toISOString(),
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/books/:id/file
router.get('/:id/file', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = await findBookOrThrow(param(req, 'id'));
    const filePath = validateFilePath(book.filePath);

    // Verify file exists
    try {
      await fsp.access(filePath);
    } catch {
      throw new AppError('FILE_NOT_FOUND', 'PDF file not found on disk');
    }

    const stat = await fsp.stat(filePath);
    const fileSize = stat.size;

    // Range header support for streaming
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'application/pdf',
      });

      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'application/pdf',
        'Accept-Ranges': 'bytes',
      });

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/books/:id/thumbnail
router.get('/:id/thumbnail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = await findBookOrThrow(param(req, 'id'));

    let thumbnailPath = book.thumbnailPath;

    // Generate if not cached
    if (!thumbnailPath) {
      thumbnailPath = await generateThumbnail(book.id, book.filePath);
      await prisma.book.update({
        where: { id: book.id },
        data: { thumbnailPath },
      });
    }

    // Verify thumbnail exists on disk
    try {
      await fsp.access(thumbnailPath);
    } catch {
      // Regenerate
      thumbnailPath = await generateThumbnail(book.id, book.filePath);
      await prisma.book.update({
        where: { id: book.id },
        data: { thumbnailPath },
      });
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const stream = fs.createReadStream(thumbnailPath);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/books/:id
const updateBookSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  author: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  isFavorite: z.boolean().optional(),
});

router.patch(
  '/:id',
  validateRequest(updateBookSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const book = await findBookOrThrow(param(req, 'id'));

      const updated = await prisma.book.update({
        where: { id: book.id },
        data: req.body,
      });

      res.json({
        id: updated.id,
        title: updated.title,
        author: updated.author,
        description: updated.description,
        fileName: updated.fileName,
        totalPages: updated.totalPages,
        fileSize: Number(updated.fileSize),
        coverUrl: resolveCoverUrl(updated),
        isFavorite: updated.isFavorite,
        addedAt: updated.addedAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/books/:id/cover
router.post(
  '/:id/cover',
  upload.single('cover'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const book = await findBookOrThrow(param(req, 'id'));

      if (!req.file) {
        throw new AppError('VALIDATION_ERROR', 'No cover file provided');
      }

      await fsp.mkdir(COVERS_DIR, { recursive: true });

      // Determine extension from mimetype
      const extMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
      };
      const ext = extMap[req.file.mimetype] || 'jpg';
      const coverFileName = `${book.id}.${ext}`;
      const coverPath = path.join(COVERS_DIR, coverFileName);

      // Resize and save
      await sharp(req.file.buffer)
        .resize(400, 560, { fit: 'cover' })
        .toFile(coverPath);

      // Update book record
      await prisma.book.update({
        where: { id: book.id },
        data: { customCoverPath: coverPath },
      });

      res.json({ coverUrl: `/api/books/${book.id}/cover` });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/books/:id/cover
router.delete('/:id/cover', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = await findBookOrThrow(param(req, 'id'));

    // Delete cover file if it exists
    if (book.customCoverPath) {
      try {
        await fsp.unlink(book.customCoverPath);
      } catch {
        // File may already be deleted
      }
    }

    const updated = await prisma.book.update({
      where: { id: book.id },
      data: { customCoverPath: null },
    });

    res.json({ coverUrl: resolveCoverUrl(updated) });
  } catch (err) {
    next(err);
  }
});

// GET /api/books/:id/cover (serve custom cover image)
router.get('/:id/cover', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = await findBookOrThrow(param(req, 'id'));

    if (!book.customCoverPath) {
      throw new AppError('FILE_NOT_FOUND', 'No custom cover set for this book');
    }

    try {
      await fsp.access(book.customCoverPath);
    } catch {
      throw new AppError('FILE_NOT_FOUND', 'Cover file not found on disk');
    }

    const ext = path.extname(book.customCoverPath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    res.setHeader('Content-Type', mimeMap[ext] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const stream = fs.createReadStream(book.customCoverPath);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

// GET /api/books/:id/progress
router.get('/:id/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await findBookOrThrow(param(req, 'id'));

    const progress = await prisma.readingProgress.findUnique({
      where: { bookId: param(req, 'id') },
    });

    if (!progress) {
      res.json(null);
      return;
    }

    res.json({
      id: progress.id,
      bookId: progress.bookId,
      currentPage: progress.currentPage,
      scrollOffset: progress.scrollOffset,
      isFinished: progress.isFinished,
      readingTimeSec: progress.readingTimeSec,
      lastReadAt: progress.lastReadAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/books/:id/progress
const progressSchema = z.object({
  currentPage: z.number().int().positive(),
  scrollOffset: z.number().min(0).max(1),
});

router.put(
  '/:id/progress',
  validateRequest(progressSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const book = await findBookOrThrow(param(req, 'id'));
      const { currentPage, scrollOffset } = req.body;

      // Auto-finish if on last page
      const isFinished = book.totalPages ? currentPage >= book.totalPages : false;

      const progress = await prisma.readingProgress.upsert({
        where: { bookId: book.id },
        create: {
          bookId: book.id,
          currentPage,
          scrollOffset,
          isFinished,
          lastReadAt: new Date(),
        },
        update: {
          currentPage,
          scrollOffset,
          isFinished,
          lastReadAt: new Date(),
        },
      });

      res.json({
        id: progress.id,
        bookId: progress.bookId,
        currentPage: progress.currentPage,
        scrollOffset: progress.scrollOffset,
        isFinished: progress.isFinished,
        readingTimeSec: progress.readingTimeSec,
        lastReadAt: progress.lastReadAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
