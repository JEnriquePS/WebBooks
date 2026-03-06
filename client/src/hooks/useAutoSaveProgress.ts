import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useReaderStore } from '../stores/readerStore';

export function useAutoSaveProgress(bookId: string) {
  const currentPage = useReaderStore((s) => s.currentPage);
  const lastSavedPage = useRef(currentPage);

  const mutation = useMutation({
    mutationFn: (data: { currentPage: number; totalPages: number }) =>
      api.updateProgress(bookId, data),
  });

  useEffect(() => {
    if (!bookId) return;

    const interval = setInterval(() => {
      const { currentPage: page, totalPages } = useReaderStore.getState();
      if (page !== lastSavedPage.current && page > 0) {
        lastSavedPage.current = page;
        mutation.mutate({ currentPage: page, totalPages });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [bookId]);

  // Save on unmount
  useEffect(() => {
    return () => {
      const { currentPage: page, totalPages } = useReaderStore.getState();
      if (page > 0 && page !== lastSavedPage.current) {
        api.updateProgress(bookId, { currentPage: page, totalPages }).catch(() => {});
      }
    };
  }, [bookId]);
}
