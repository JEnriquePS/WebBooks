export interface BookResponse {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  fileName: string;
  totalPages: number | null;
  fileSize: number;
  coverUrl: string | null;
  folder: string;
  isFavorite: boolean;
  addedAt: string;
  year: number | null;
  pdfMetadata: {
    title: string | null;
    author: string | null;
    subject: string | null;
    keywords: string | null;
    creator: string | null;
    producer: string | null;
    creationDate: string | null;
    modDate: string | null;
  } | null;
  progress: {
    currentPage: number;
    percentage: number;
    isFinished: boolean;
    lastReadAt: string;
  } | null;
}

export interface AnnotationResponse {
  id: string;
  bookId: string;
  pageNumber: number;
  selectedText: string;
  note: string | null;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  positionData: PositionData;
  createdAt: string;
}

export interface PositionData {
  rects: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  pageWidth: number;
  pageHeight: number;
}

export interface RandomAnnotationResponse extends AnnotationResponse {
  book: {
    id: string;
    title: string;
    author: string | null;
    coverUrl: string | null;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
