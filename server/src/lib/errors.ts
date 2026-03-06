export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'PATH_TRAVERSAL'
  | 'BOOK_NOT_FOUND'
  | 'FILE_NOT_FOUND'
  | 'ANNOTATION_NOT_FOUND'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;

  constructor(code: ErrorCode, message: string, statusCode?: number) {
    super(message);
    this.code = code;
    this.name = 'AppError';

    if (statusCode) {
      this.statusCode = statusCode;
    } else {
      switch (code) {
        case 'VALIDATION_ERROR':
          this.statusCode = 400;
          break;
        case 'PATH_TRAVERSAL':
          this.statusCode = 403;
          break;
        case 'BOOK_NOT_FOUND':
        case 'FILE_NOT_FOUND':
        case 'ANNOTATION_NOT_FOUND':
          this.statusCode = 404;
          break;
        case 'INTERNAL_ERROR':
        default:
          this.statusCode = 500;
          break;
      }
    }
  }
}
