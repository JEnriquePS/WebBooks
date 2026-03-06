-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_books" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "totalPages" INTEGER,
    "fileSize" BIGINT NOT NULL,
    "thumbnailPath" TEXT,
    "customCoverPath" TEXT,
    "coverColor" TEXT,
    "folder" TEXT NOT NULL DEFAULT '',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_books" ("addedAt", "author", "coverColor", "customCoverPath", "description", "fileName", "filePath", "fileSize", "id", "isFavorite", "thumbnailPath", "title", "totalPages", "updatedAt") SELECT "addedAt", "author", "coverColor", "customCoverPath", "description", "fileName", "filePath", "fileSize", "id", "isFavorite", "thumbnailPath", "title", "totalPages", "updatedAt" FROM "books";
DROP TABLE "books";
ALTER TABLE "new_books" RENAME TO "books";
CREATE UNIQUE INDEX "books_fileName_key" ON "books"("fileName");
CREATE UNIQUE INDEX "books_filePath_key" ON "books"("filePath");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
