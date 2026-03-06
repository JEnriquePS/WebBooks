import type { BookResponse, AnnotationResponse, RandomAnnotationResponse } from '../types';

const API_BASE = '/api';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { code: 'UNKNOWN', message: 'Unknown error' } }));
    throw error.error || { code: 'UNKNOWN', message: res.statusText };
  }
  return res.json();
}

export const api = {
  getLibrary: (params?: { filter?: string; search?: string; folder?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.filter && params.filter !== 'all') searchParams.set('filter', params.filter);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.folder !== undefined && params.folder !== '') searchParams.set('folder', params.folder);
    const query = searchParams.toString();
    return fetchApi<{ books: BookResponse[]; folders: string[]; currentFolder: string; total: number }>(`/library${query ? `?${query}` : ''}`);
  },

  scanLibrary: () => fetchApi<{ added: number; removed: number; updated: number; total: number }>('/library/scan', { method: 'POST' }),

  getBookFile: (id: string) => `${API_BASE}/books/${id}/file`,

  getBookThumbnail: (id: string) => `${API_BASE}/books/${id}/thumbnail`,

  getAnnotations: (bookId: string) =>
    fetchApi<{ annotations: AnnotationResponse[]; total: number }>(`/books/${bookId}/annotations`).then(
      (res) => res.annotations
    ),

  createAnnotation: (bookId: string, data: Omit<AnnotationResponse, 'id' | 'bookId' | 'createdAt'>) =>
    fetchApi<AnnotationResponse>(`/books/${bookId}/annotations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAnnotation: (id: string, data: Partial<Pick<AnnotationResponse, 'note' | 'color'>>) =>
    fetchApi<AnnotationResponse>(`/annotations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteAnnotation: (id: string) =>
    fetchApi<void>(`/annotations/${id}`, { method: 'DELETE' }),

  getRandomAnnotations: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return fetchApi<{ annotations: RandomAnnotationResponse[] }>(`/annotations/random${query}`).then(
      (res) => res.annotations
    );
  },

  getProgress: (bookId: string) =>
    fetchApi<{
      id: string;
      bookId: string;
      currentPage: number;
      scrollOffset: number;
      isFinished: boolean;
      readingTimeSec: number;
      lastReadAt: string;
    } | null>(`/books/${bookId}/progress`),

  updateProgress: (bookId: string, data: { currentPage: number; totalPages: number }) =>
    fetchApi<{
      id: string;
      bookId: string;
      currentPage: number;
      scrollOffset: number;
      isFinished: boolean;
      readingTimeSec: number;
      lastReadAt: string;
    }>(`/books/${bookId}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ currentPage: data.currentPage, scrollOffset: 0 }),
    }),

  updateBookMetadata: (id: string, data: { title?: string; author?: string | null; description?: string | null }) =>
    fetchApi<BookResponse>(`/books/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  uploadCover: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('cover', file);
    const res = await fetch(`${API_BASE}/books/${id}/cover`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { code: 'UNKNOWN', message: 'Unknown error' } }));
      throw error.error || { code: 'UNKNOWN', message: res.statusText };
    }
    return res.json() as Promise<BookResponse>;
  },

  deleteCover: (id: string) =>
    fetchApi<BookResponse>(`/books/${id}/cover`, { method: 'DELETE' }),

  exportAnnotations: async (bookId: string) => {
    const res = await fetch(`${API_BASE}/books/${bookId}/annotations/export`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { code: 'UNKNOWN', message: 'Unknown error' } }));
      throw error.error || { code: 'UNKNOWN', message: res.statusText };
    }
    return res.blob();
  },

  toggleFavorite: (id: string, isFavorite: boolean) =>
    fetchApi<BookResponse>(`/books/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isFavorite }),
    }),
};
