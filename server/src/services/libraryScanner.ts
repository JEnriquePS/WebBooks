import path from 'path';
import fs from 'fs/promises';
import { watch } from 'chokidar';
import pdfParse from 'pdf-parse';
import prisma from '../lib/prisma.js';
import { generateThumbnail } from './thumbnailService.js';

const BOOKS_DIR = path.resolve(process.env.BOOKS_DIR || '../books');

let scanning = false;

export function getBooksDir(): string {
  return BOOKS_DIR;
}

interface ScanResult {
  added: number;
  removed: number;
  updated: number;
  total: number;
}

interface PdfMetadata {
  title: string | null;
  author: string | null;
  subject: string | null;
  keywords: string | null;
  creator: string | null;
  producer: string | null;
  creationDate: string | null;
  modDate: string | null;
  totalPages: number | null;
}

function parseFileName(fileName: string): { title: string; author: string | null; year: number | null } {
  const baseName = fileName.replace(/\.pdf$/i, '');

  // Pattern: "Title - Author - Year" (greedy title to handle dashes in title)
  const match3 = baseName.match(/^(.+)\s+-\s+(.+?)\s*-\s*(\d{4})$/);
  if (match3) {
    return { title: match3[1].trim(), author: match3[2].trim(), year: parseInt(match3[3]) };
  }

  // Pattern: "Title (Author, Year)"
  const matchParen = baseName.match(/^(.+?)\s*\((.+?),\s*(\d{4})\)$/);
  if (matchParen) {
    return { title: matchParen[1].trim(), author: matchParen[2].trim(), year: parseInt(matchParen[3]) };
  }

  // Pattern: "Title - Author" (greedy title to handle dashes in title)
  const match2 = baseName.match(/^(.+)\s+-\s+(.+?)$/);
  if (match2) {
    return { title: match2[1].trim(), author: match2[2].trim(), year: null };
  }

  return { title: baseName, author: null, year: null };
}

function extractYearFromPdfDate(pdfDate: string | null): number | null {
  if (!pdfDate) return null;
  // PDF dates are typically in format: D:YYYYMMDDHHmmSS or just YYYY...
  const match = pdfDate.match(/(\d{4})/);
  if (match) {
    const year = parseInt(match[1]);
    if (year >= 1000 && year <= 9999) return year;
  }
  return null;
}

async function findPdfFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await findPdfFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function scanLibrary(): Promise<ScanResult> {
  if (scanning) {
    console.log('Scan already in progress, skipping...');
    return { added: 0, removed: 0, updated: 0, total: await prisma.book.count() };
  }
  scanning = true;

  try {
    let added = 0;
    let removed = 0;
    let updated = 0;

    // Ensure BOOKS_DIR exists
    try {
      await fs.access(BOOKS_DIR);
    } catch {
      await fs.mkdir(BOOKS_DIR, { recursive: true });
    }

    // Find all PDF files
    const pdfFiles = await findPdfFiles(BOOKS_DIR);

    // Get existing books from DB
    const existingBooks = await prisma.book.findMany({
      select: { id: true, filePath: true, fileSize: true, pdfTitle: true, year: true },
    });
    const existingByPath = new Map(existingBooks.map((b) => [b.filePath, b]));
    const foundPaths = new Set<string>();

    for (const filePath of pdfFiles) {
      foundPaths.add(filePath);
      const stats = await fs.stat(filePath);
      const fileSize = BigInt(stats.size);
      const fileName = path.basename(filePath);
      const existing = existingByPath.get(filePath);

      // Calculate folder relative to BOOKS_DIR
      const relativeFolder = path.relative(BOOKS_DIR, path.dirname(filePath));
      const folder = relativeFolder === '.' ? '' : relativeFolder;

      if (existing) {
        // Always update folder and year from filename
        const parsedName = parseFileName(fileName);
        const data: Record<string, unknown> = { folder };

        // Always update year from filename (publication year) if available
        if (parsedName.year && existing.year !== parsedName.year) {
          data.year = parsedName.year;
        }

        const needsMetadataUpdate = existing.fileSize !== fileSize || existing.pdfTitle === null;
        if (needsMetadataUpdate) {
          const metadata = await extractMetadata(filePath);
          const year = parsedName.year || extractYearFromPdfDate(metadata.creationDate);
          data.fileSize = fileSize;
          data.totalPages = metadata.totalPages;
          data.year = year;
          data.pdfTitle = metadata.title;
          data.pdfAuthor = metadata.author;
          data.pdfSubject = metadata.subject;
          data.pdfKeywords = metadata.keywords;
          data.pdfCreator = metadata.creator;
          data.pdfProducer = metadata.producer;
          data.pdfCreationDate = metadata.creationDate;
          data.pdfModDate = metadata.modDate;
          // If this is the first metadata extraction, also update title/author
          // with the best resolved values (only if not manually edited)
          if (existing.pdfTitle === null) {
            data.title = metadata.title || parsedName.title;
            data.author = metadata.author || parsedName.author || null;
          }
          updated++;
        }
        await prisma.book.update({
          where: { id: existing.id },
          data,
        });
      } else {
        // New book — use upsert to avoid unique constraint race conditions
        const metadata = await extractMetadata(filePath);
        const parsedName = parseFileName(fileName);
        const title = metadata.title || parsedName.title;
        const author = metadata.author || parsedName.author || null;
        const year = parsedName.year || extractYearFromPdfDate(metadata.creationDate);

        const book = await prisma.book.upsert({
          where: { filePath },
          create: {
            title,
            author,
            fileName,
            filePath,
            totalPages: metadata.totalPages,
            fileSize,
            folder,
            year,
            pdfTitle: metadata.title,
            pdfAuthor: metadata.author,
            pdfSubject: metadata.subject,
            pdfKeywords: metadata.keywords,
            pdfCreator: metadata.creator,
            pdfProducer: metadata.producer,
            pdfCreationDate: metadata.creationDate,
            pdfModDate: metadata.modDate,
          },
          update: {
            fileSize,
            totalPages: metadata.totalPages,
            folder,
            year,
            pdfTitle: metadata.title,
            pdfAuthor: metadata.author,
            pdfSubject: metadata.subject,
            pdfKeywords: metadata.keywords,
            pdfCreator: metadata.creator,
            pdfProducer: metadata.producer,
            pdfCreationDate: metadata.creationDate,
            pdfModDate: metadata.modDate,
          },
        });

        // Generate thumbnail in background (don't block scan)
        generateThumbnail(book.id, filePath)
          .then(async (thumbnailPath) => {
            await prisma.book.update({
              where: { id: book.id },
              data: { thumbnailPath },
            });
          })
          .catch((err) => {
            console.error(`Failed to generate thumbnail for ${fileName}:`, err);
          });

        added++;
      }
    }

    // Remove books whose files no longer exist
    for (const existing of existingBooks) {
      if (!foundPaths.has(existing.filePath)) {
        await prisma.book.delete({ where: { id: existing.id } });
        removed++;
      }
    }

    const total = await prisma.book.count();

    return { added, removed, updated, total };
  } finally {
    scanning = false;
  }
}

async function extractMetadata(filePath: string): Promise<PdfMetadata> {
  // Suppress noisy pdf.js warnings during parsing
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);

    const info = data.info || {};
    return {
      title: info.Title || null,
      author: info.Author || null,
      subject: info.Subject || null,
      keywords: info.Keywords || null,
      creator: info.Creator || null,
      producer: info.Producer || null,
      creationDate: info.CreationDate || null,
      modDate: info.ModDate || null,
      totalPages: data.numpages || null,
    };
  } catch (err) {
    console.error(`Failed to parse PDF metadata for ${filePath}:`, err);
    return { title: null, author: null, subject: null, keywords: null, creator: null, producer: null, creationDate: null, modDate: null, totalPages: null };
  } finally {
    console.warn = originalWarn;
  }
}

export function startFileWatcher(): void {
  console.log(`Watching ${BOOKS_DIR} for PDF changes...`);

  const watcher = watch(BOOKS_DIR, {
    ignored: (filePath: string) => {
      // Ignore non-PDF files (but allow directories)
      if (!filePath) return false;
      const ext = path.extname(filePath).toLowerCase();
      // If it has an extension and it's not .pdf, ignore it
      return ext !== '' && ext !== '.pdf';
    },
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });

  let scanTimeout: ReturnType<typeof setTimeout> | null = null;

  const debouncedScan = () => {
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(async () => {
      try {
        console.log('File change detected, re-scanning library...');
        const result = await scanLibrary();
        console.log(`Scan complete: +${result.added} -${result.removed} ~${result.updated} (${result.total} total)`);
      } catch (err) {
        console.error('Scan failed:', err);
      }
    }, 1000);
  };

  watcher.on('add', debouncedScan);
  watcher.on('unlink', debouncedScan);
}
