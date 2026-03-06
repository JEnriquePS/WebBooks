export function resolveCoverUrl(book: {
  id: string;
  customCoverPath: string | null;
  thumbnailPath: string | null;
}): string | null {
  if (book.customCoverPath) return `/api/books/${book.id}/cover`;
  if (book.thumbnailPath) return `/api/books/${book.id}/thumbnail`;
  return null;
}
