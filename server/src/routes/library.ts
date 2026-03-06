import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { resolveCoverUrl } from '../lib/coverUrl.js';
import { scanLibrary } from '../services/libraryScanner.js';
import type { BookResponse } from '../types/index.js';
import { Prisma } from '@prisma/client';

const router = Router();

// GET /api/library
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter = (req.query.filter as string) || 'all';
    const search = (req.query.search as string) || '';
    const currentFolder = (req.query.folder as string) ?? '';

    const where: Prisma.BookWhereInput = {};

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { author: { contains: search } },
        { fileName: { contains: search } },
      ];
    }

    // Category filters
    switch (filter) {
      case 'favorites':
        where.isFavorite = true;
        break;
      case 'recent': {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        where.readingProgress = {
          lastReadAt: { gte: sevenDaysAgo },
        };
        break;
      }
      case 'in-progress':
        where.readingProgress = {
          isFinished: false,
          currentPage: { gt: 1 },
        };
        break;
      case 'finished':
        where.readingProgress = {
          isFinished: true,
        };
        break;
      case 'all':
      default:
        // Only filter by folder when showing "all" with no search
        if (!search) {
          where.folder = currentFolder;
        }
        break;
    }

    const books = await prisma.book.findMany({
      where,
      include: {
        readingProgress: true,
      },
      orderBy: { addedAt: 'desc' },
    });

    // Get all distinct folder values to compute subfolders
    const allFolders = await prisma.book.findMany({
      select: { folder: true },
      distinct: ['folder'],
    });

    const prefix = currentFolder === '' ? '' : currentFolder + '/';
    const subfoldersSet = new Set<string>();
    for (const { folder } of allFolders) {
      if (currentFolder === '') {
        // Root: immediate children are folders with no "/" or the first segment
        if (folder !== '') {
          const firstSegment = folder.split('/')[0];
          subfoldersSet.add(firstSegment);
        }
      } else {
        // Non-root: find folders that start with prefix and extract next segment
        if (folder.startsWith(prefix)) {
          const rest = folder.slice(prefix.length);
          if (rest !== '') {
            const nextSegment = rest.split('/')[0];
            subfoldersSet.add(nextSegment);
          }
        }
      }
    }
    const folders = Array.from(subfoldersSet).sort();

    const bookResponses: BookResponse[] = books.map((book) => {
      const progress = book.readingProgress;
      const percentage =
        progress && book.totalPages
          ? Math.round((progress.currentPage / book.totalPages) * 100)
          : 0;

      return {
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
      };
    });

    res.json({ books: bookResponses, folders, currentFolder, total: bookResponses.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/library/scan
router.post('/scan', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await scanLibrary();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
