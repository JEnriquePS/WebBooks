import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { resolveCoverUrl } from '../lib/coverUrl.js';
import { AppError } from '../lib/errors.js';
import { validateRequest } from '../middleware/validateRequest.js';
import type { AnnotationResponse, RandomAnnotationResponse, PositionData } from '../types/index.js';

const router = Router();

// Helper to safely extract a route param as string
function param(req: Request, name: string): string {
  const val = req.params[name];
  if (Array.isArray(val)) return val[0];
  return val as string;
}

// Helper: parse positionData from DB string
function parsePositionData(raw: string): PositionData {
  try {
    return JSON.parse(raw) as PositionData;
  } catch {
    return { rects: [], pageWidth: 0, pageHeight: 0 };
  }
}

// Helper: format annotation for response
function formatAnnotation(a: {
  id: string;
  bookId: string;
  pageNumber: number;
  selectedText: string;
  note: string | null;
  color: string;
  positionData: string;
  createdAt: Date;
}): AnnotationResponse {
  return {
    id: a.id,
    bookId: a.bookId,
    pageNumber: a.pageNumber,
    selectedText: a.selectedText,
    note: a.note,
    color: a.color as AnnotationResponse['color'],
    positionData: parsePositionData(a.positionData),
    createdAt: a.createdAt.toISOString(),
  };
}

// Zod schemas
const rectSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

const positionDataSchema = z.object({
  rects: z.array(rectSchema).nonempty(),
  pageWidth: z.number().positive(),
  pageHeight: z.number().positive(),
});

const createAnnotationSchema = z.object({
  pageNumber: z.number().int().positive(),
  selectedText: z.string().min(1).max(2000),
  color: z.enum(['yellow', 'green', 'blue', 'pink']),
  positionData: positionDataSchema,
  note: z.string().nullish(),
});

const updateAnnotationSchema = z.object({
  note: z.string().nullish(),
  color: z.enum(['yellow', 'green', 'blue', 'pink']).optional(),
});

// GET /api/books/:bookId/annotations
router.get(
  '/books/:bookId/annotations',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify book exists
      const book = await prisma.book.findUnique({ where: { id: param(req, 'bookId') } });
      if (!book) {
        throw new AppError('BOOK_NOT_FOUND', `Book with id ${param(req, 'bookId')} not found`);
      }

      const annotations = await prisma.annotation.findMany({
        where: { bookId: param(req, 'bookId') },
        orderBy: [{ pageNumber: 'asc' }, { createdAt: 'asc' }],
      });

      const formatted = annotations.map(formatAnnotation);

      res.json({ annotations: formatted, total: formatted.length });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/books/:bookId/annotations
router.post(
  '/books/:bookId/annotations',
  validateRequest(createAnnotationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const book = await prisma.book.findUnique({ where: { id: param(req, 'bookId') } });
      if (!book) {
        throw new AppError('BOOK_NOT_FOUND', `Book with id ${param(req, 'bookId')} not found`);
      }

      const { pageNumber, selectedText, color, positionData, note } = req.body;

      const annotation = await prisma.annotation.create({
        data: {
          bookId: param(req, 'bookId'),
          pageNumber,
          selectedText,
          color,
          positionData: JSON.stringify(positionData),
          note: note || null,
        },
      });

      res.status(201).json(formatAnnotation(annotation));
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/annotations/:id
router.patch(
  '/annotations/:id',
  validateRequest(updateAnnotationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const annotation = await prisma.annotation.findUnique({
        where: { id: param(req, 'id') },
      });

      if (!annotation) {
        throw new AppError('ANNOTATION_NOT_FOUND', `Annotation with id ${param(req, 'id')} not found`);
      }

      const updated = await prisma.annotation.update({
        where: { id: param(req, 'id') },
        data: req.body,
      });

      res.json(formatAnnotation(updated));
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/annotations/:id
router.delete(
  '/annotations/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const annotation = await prisma.annotation.findUnique({
        where: { id: param(req, 'id') },
      });

      if (!annotation) {
        throw new AppError('ANNOTATION_NOT_FOUND', `Annotation with id ${param(req, 'id')} not found`);
      }

      await prisma.annotation.delete({ where: { id: param(req, 'id') } });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/annotations/random
router.get(
  '/annotations/random',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limitParam = parseInt(req.query.limit as string, 10);
      const limit = isNaN(limitParam) ? 6 : Math.min(Math.max(limitParam, 1), 10);

      // SQLite supports ORDER BY RANDOM()
      const annotations = await prisma.$queryRawUnsafe<
        Array<{
          id: string;
          bookId: string;
          pageNumber: number;
          selectedText: string;
          note: string | null;
          color: string;
          positionData: string;
          createdAt: string;
          book_id: string;
          book_title: string;
          book_author: string | null;
          book_customCoverPath: string | null;
          book_thumbnailPath: string | null;
        }>
      >(
        `SELECT
          a.id, a.bookId, a.pageNumber, a.selectedText, a.note, a.color, a.positionData, a.createdAt,
          b.id as book_id, b.title as book_title, b.author as book_author,
          b.customCoverPath as book_customCoverPath, b.thumbnailPath as book_thumbnailPath
        FROM annotations a
        JOIN books b ON a.bookId = b.id
        ORDER BY RANDOM()
        LIMIT ?`,
        limit
      );

      const result: RandomAnnotationResponse[] = annotations.map((a) => ({
        id: a.id,
        bookId: a.bookId,
        pageNumber: a.pageNumber,
        selectedText: a.selectedText,
        note: a.note,
        color: a.color as AnnotationResponse['color'],
        positionData: parsePositionData(a.positionData),
        createdAt: typeof a.createdAt === 'string' ? a.createdAt : new Date(a.createdAt).toISOString(),
        book: {
          id: a.book_id,
          title: a.book_title,
          author: a.book_author,
          coverUrl: resolveCoverUrl({
            id: a.book_id,
            customCoverPath: a.book_customCoverPath,
            thumbnailPath: a.book_thumbnailPath,
          }),
        },
      }));

      res.json({ annotations: result });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/books/:bookId/annotations/export
router.get(
  '/books/:bookId/annotations/export',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const book = await prisma.book.findUnique({ where: { id: param(req, 'bookId') } });
      if (!book) {
        throw new AppError('BOOK_NOT_FOUND', `Book with id ${param(req, 'bookId')} not found`);
      }

      const annotations = await prisma.annotation.findMany({
        where: { bookId: param(req, 'bookId') },
        orderBy: [{ pageNumber: 'asc' }, { createdAt: 'asc' }],
      });

      const now = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      let markdown = `# Anotaciones: ${book.title}\n`;
      markdown += `Exportado: ${now}\n\n`;

      let currentPage = -1;

      for (const annotation of annotations) {
        if (annotation.pageNumber !== currentPage) {
          currentPage = annotation.pageNumber;
          markdown += `## Página ${currentPage}\n\n`;
        }

        markdown += `> ${annotation.selectedText}\n\n`;

        if (annotation.note) {
          markdown += `**Nota:** ${annotation.note}\n\n`;
        }

        markdown += `Color: ${annotation.color}\n\n`;
        markdown += `---\n\n`;
      }

      const safeTitle = book.title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
      const filename = `${safeTitle}-annotations.md`;

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(markdown);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
