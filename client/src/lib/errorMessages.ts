const ERROR_MESSAGES: Record<string, string> = {
  BOOK_NOT_FOUND: 'El libro no fue encontrado. Puede haber sido eliminado de la biblioteca.',
  FILE_NOT_FOUND: 'El archivo PDF no se encontró en disco. Verifica que no haya sido movido o eliminado.',
  ANNOTATION_NOT_FOUND: 'La anotación ya no existe. Puede haber sido eliminada en otra sesión.',
  PATH_TRAVERSAL: 'Acceso denegado al archivo solicitado.',
  INTERNAL_ERROR: 'Ocurrió un error inesperado en el servidor. Intenta de nuevo más tarde.',
  VALIDATION_ERROR: '',
};

export function getErrorMessage(error: unknown): string {
  if (!error) return 'Error desconocido';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    const err = error as { code?: string; message?: string };
    if (err.code && ERROR_MESSAGES[err.code] !== undefined) {
      return ERROR_MESSAGES[err.code] || err.message || 'Error desconocido';
    }
    if (err.message) return err.message;
  }
  return 'No se pudo conectar con el servidor. Verifica tu conexión.';
}
