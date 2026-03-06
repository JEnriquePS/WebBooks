import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { getErrorMessage } from '../lib/errorMessages';
import type { AnnotationResponse } from '../types';

interface CreateHighlightInput {
  pageNumber: number;
  selectedText: string;
  note?: string;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  positionData: {
    rects: Array<{ x: number; y: number; width: number; height: number }>;
    pageWidth: number;
    pageHeight: number;
  };
}

export function useHighlights(bookId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['annotations', bookId];

  const query = useQuery({
    queryKey,
    queryFn: () => api.getAnnotations(bookId),
    enabled: !!bookId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateHighlightInput) => {
      const payload: Omit<AnnotationResponse, 'id' | 'bookId' | 'createdAt'> = {
        pageNumber: data.pageNumber,
        selectedText: data.selectedText,
        note: data.note || null,
        color: data.color,
        positionData: data.positionData,
      };
      return api.createAnnotation(bookId, payload);
    },
    onMutate: async (newAnnotation) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<AnnotationResponse[]>(queryKey);

      const optimistic: AnnotationResponse = {
        id: `temp-${Date.now()}`,
        bookId,
        pageNumber: newAnnotation.pageNumber,
        selectedText: newAnnotation.selectedText,
        note: newAnnotation.note || null,
        color: newAnnotation.color,
        positionData: newAnnotation.positionData,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<AnnotationResponse[]>(queryKey, [
        ...(previous ?? []),
        optimistic,
      ]);

      return { previous };
    },
    onError: (err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(getErrorMessage(err));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { note?: string; color?: 'yellow' | 'green' | 'blue' | 'pink' } }) =>
      api.updateAnnotation(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<AnnotationResponse[]>(queryKey);

      if (previous) {
        queryClient.setQueryData<AnnotationResponse[]>(
          queryKey,
          previous.map((a) => (a.id === id ? { ...a, ...data } : a))
        );
      }

      return { previous };
    },
    onError: (err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(getErrorMessage(err));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAnnotation(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<AnnotationResponse[]>(queryKey);

      if (previous) {
        queryClient.setQueryData<AnnotationResponse[]>(
          queryKey,
          previous.filter((a) => a.id !== id)
        );
      }

      return { previous };
    },
    onError: (err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(getErrorMessage(err));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onSuccess: () => {
      toast.success('Anotación eliminada');
    },
  });

  return {
    annotations: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createHighlight: createMutation.mutate,
    updateHighlight: updateMutation.mutate,
    deleteHighlight: deleteMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
