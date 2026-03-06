import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { getErrorMessage } from '../../lib/errorMessages';
import { useReaderStore } from '../../stores/readerStore';
import { useHighlights } from '../../hooks/useHighlights';
import { useAutoSaveProgress } from '../../hooks/useAutoSaveProgress';
import { ReaderToolbar } from './ReaderToolbar';
import { SearchBar } from './SearchBar';
import { PDFViewer } from './PDFViewer';
import { TOCSidebar } from './TOCSidebar';
import { ThumbnailSidebar } from './ThumbnailSidebar';
import { AnnotationPanel } from './AnnotationPanel';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { BookResponse } from '../../types';

export function ReaderView() {
  const { bookId } = useParams<{ bookId: string }>();
  const leftSidebarOpen = useReaderStore((s) => s.leftSidebarOpen);
  const leftSidebarTab = useReaderStore((s) => s.leftSidebarTab);
  const rightSidebarOpen = useReaderStore((s) => s.rightSidebarOpen);
  const setCurrentPage = useReaderStore((s) => s.setCurrentPage);
  const setLeftSidebarTab = useReaderStore((s) => s.setLeftSidebarTab);
  const toggleLeftSidebar = useReaderStore((s) => s.toggleLeftSidebar);
  const toggleRightSidebar = useReaderStore((s) => s.toggleRightSidebar);
  const toggleSearch = useReaderStore((s) => s.toggleSearch);
  const searchOpen = useReaderStore((s) => s.searchOpen);
  const zoomIn = useReaderStore((s) => s.zoomIn);
  const zoomOut = useReaderStore((s) => s.zoomOut);
  const reset = useReaderStore((s) => s.reset);

  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);

  // Fetch book details
  const bookQuery = useQuery<BookResponse>({
    queryKey: ['book', bookId],
    queryFn: async () => {
      const res = await fetch(`/api/books/${bookId}`);
      if (!res.ok) throw new Error('Failed to load book');
      return res.json();
    },
    enabled: !!bookId,
  });

  // Fetch progress on mount
  const progressQuery = useQuery({
    queryKey: ['progress', bookId],
    queryFn: () => api.getProgress(bookId!),
    enabled: !!bookId,
  });

  // Restore progress
  useEffect(() => {
    if (progressQuery.data?.currentPage) {
      setCurrentPage(progressQuery.data.currentPage);
    }
  }, [progressQuery.data, setCurrentPage]);

  // Highlights
  const {
    annotations,
    isLoading: annotationsLoading,
    createHighlight,
    updateHighlight,
    deleteHighlight,
  } = useHighlights(bookId!);

  // Auto-save progress
  useAutoSaveProgress(bookId!);

  // Reset on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'Escape') {
        if (searchOpen) {
          toggleSearch();
          e.preventDefault();
        }
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            toggleSearch();
            break;
          case '[':
            e.preventDefault();
            toggleLeftSidebar();
            break;
          case ']':
            e.preventDefault();
            toggleRightSidebar();
            break;
          case '=':
          case '+':
            e.preventDefault();
            zoomIn();
            break;
          case '-':
            e.preventDefault();
            zoomOut();
            break;
        }
        return;
      }

      if (isInput) return;

      const { currentPage, totalPages } = useReaderStore.getState();

      switch (e.key) {
        case 'j':
          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
          break;
        case 'k':
          if (currentPage > 1) setCurrentPage(currentPage - 1);
          break;
        case 'f':
          if (!e.ctrlKey && !e.metaKey) {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen().catch(() => {});
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, toggleSearch, toggleLeftSidebar, toggleRightSidebar, zoomIn, zoomOut, setCurrentPage]);

  const handleDocumentLoad = useCallback((doc: PDFDocumentProxy) => {
    setPdfDocument(doc);
  }, []);

  const handleCreateHighlight = useCallback(
    (data: Parameters<typeof createHighlight>[0]) => {
      createHighlight(data);
    },
    [createHighlight]
  );

  const handleUpdateHighlight = useCallback(
    (id: string, data: { note?: string; color?: 'yellow' | 'green' | 'blue' | 'pink' }) => {
      updateHighlight({ id, data });
    },
    [updateHighlight]
  );

  const handleDeleteHighlight = useCallback(
    (id: string) => {
      deleteHighlight(id);
    },
    [deleteHighlight]
  );

  if (!bookId) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-app">
        <p className="text-text-secondary">Libro no encontrado</p>
      </div>
    );
  }

  const fileUrl = api.getBookFile(bookId);
  const bookTitle = bookQuery.data?.title || 'Cargando...';

  if (bookQuery.isError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-bg-app gap-3">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-text-primary font-medium">Error al cargar el libro</p>
        <p className="text-sm text-text-secondary">{getErrorMessage(bookQuery.error)}</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-bg-app overflow-hidden">
      <ReaderToolbar bookTitle={bookTitle} />

      <div className="relative flex-1 flex overflow-hidden">
        <SearchBar pdfDocument={pdfDocument} />

        {/* Left Sidebar */}
        <div
          className={`shrink-0 bg-bg-sidebar border-r border-border flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
            leftSidebarOpen ? 'w-[280px]' : 'w-0'
          }`}
        >
          {leftSidebarOpen && (
            <>
              <div className="flex border-b border-border shrink-0">
                <button
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    leftSidebarTab === 'toc'
                      ? 'text-accent border-b-2 border-accent'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                  onClick={() => setLeftSidebarTab('toc')}
                >
                  Contenido
                </button>
                <button
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    leftSidebarTab === 'thumbnails'
                      ? 'text-accent border-b-2 border-accent'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                  onClick={() => setLeftSidebarTab('thumbnails')}
                >
                  Miniaturas
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {leftSidebarTab === 'toc' ? (
                  <TOCSidebar pdfDocument={pdfDocument} />
                ) : (
                  <ThumbnailSidebar fileUrl={fileUrl} />
                )}
              </div>
            </>
          )}
        </div>

        {/* PDF Canvas */}
        <PDFViewer
          fileUrl={fileUrl}
          annotations={annotations}
          onDocumentLoad={handleDocumentLoad}
          onCreateHighlight={handleCreateHighlight}
          onUpdateHighlight={handleUpdateHighlight}
          onDeleteHighlight={handleDeleteHighlight}
        />

        {/* Right Sidebar */}
        <div
          className={`shrink-0 bg-bg-sidebar border-l border-border flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
            rightSidebarOpen ? 'w-[320px]' : 'w-0'
          }`}
        >
          {rightSidebarOpen && (
            <AnnotationPanel
              bookId={bookId}
              annotations={annotations}
              isLoading={annotationsLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
