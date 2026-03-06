import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

const CACHE_DIR = path.resolve(process.cwd(), '../cache');
const THUMBNAILS_DIR = path.join(CACHE_DIR, 'thumbnails');

export async function ensureThumbnailDirs(): Promise<void> {
  await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
  await fs.mkdir(path.join(CACHE_DIR, 'covers'), { recursive: true });
}

export async function generateThumbnail(
  bookId: string,
  _filePath: string
): Promise<string> {
  const thumbnailPath = path.join(THUMBNAILS_DIR, `${bookId}.png`);

  // Check if thumbnail already exists
  try {
    await fs.access(thumbnailPath);
    return thumbnailPath;
  } catch {
    // Thumbnail doesn't exist, generate it
  }

  // Generate a placeholder colored thumbnail using sharp
  // We create a gradient-like cover with the book ID as a seed for color
  const hash = simpleHash(bookId);
  const hue = hash % 360;
  const r = hslToRgb(hue, 0.45, 0.55);

  const svg = `
    <svg width="400" height="560" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:rgb(${r[0]},${r[1]},${r[2]});stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgb(${Math.max(0, r[0] - 40)},${Math.max(0, r[1] - 40)},${Math.max(0, r[2] - 40)});stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="560" fill="url(#bg)" rx="8" />
      <rect x="40" y="200" width="320" height="4" fill="rgba(255,255,255,0.3)" rx="2" />
      <rect x="60" y="220" width="280" height="3" fill="rgba(255,255,255,0.2)" rx="1.5" />
      <rect x="80" y="240" width="240" height="3" fill="rgba(255,255,255,0.15)" rx="1.5" />
      <text x="200" y="300" font-family="serif" font-size="24" fill="rgba(255,255,255,0.6)" text-anchor="middle">PDF</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(thumbnailPath);

  return thumbnailPath;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}
