import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useReaderStore } from '../../stores/readerStore';
import { useTextSelection } from '../../hooks/useTextSelection';
import { HighlightLayer } from './HighlightLayer';
import { HighlightPopover } from './HighlightPopover';
import type { AnnotationResponse } from '../../types';
import type { PDFDocumentProxy } from 'pdfjs-dist';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  fileUrl: string;
  annotations: AnnotationResponse[];
  onDocumentLoad: (doc: PDFDocumentProxy) => void;
  onCreateHighlight: (data: {
    pageNumber: number;
    selectedText: string;
    note?: string;
    color: 'yellow' | 'green' | 'blue' | 'pink';
    positionData: {
      rects: Array<{ x: number; y: number; width: number; height: number }>;
      pageWidth: number;
      pageHeight: number;
    };
  }) => void;
  onUpdateHighlight: (id: string, data: { note?: string; color?: 'yellow' | 'green' | 'blue' | 'pink' }) => void;
  onDeleteHighlight: (id: string) => void;
}

interface EditingHighlight {
  annotation: AnnotationResponse;
  rect: { top: number; left: number };
}

export function PDFViewer({
  fileUrl,
  annotations,
  onDocumentLoad,
  onCreateHighlight,
  onUpdateHighlight,
  onDeleteHighlight,
}: PDFViewerProps) {
  const viewMode = useReaderStore((s) => s.viewMode);
  const zoom = useReaderStore((s) => s.zoom);
  const currentPage = useReaderStore((s) => s.currentPage);
  const totalPages = useReaderStore((s) => s.totalPages);
  const setCurrentPage = useReaderStore((s) => s.setCurrentPage);
  const setTotalPages = useReaderStore((s) => s.setTotalPages);
  const searchResults = useReaderStore((s) => s.searchResults);
  const currentSearchIndex = useReaderStore((s) => s.currentSearchIndex);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [pageHeight, setPageHeight] = useState(792); // Default US Letter height
  const [pageWidth, setPageWidth] = useState(612);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1, 2, 3]));
  const [editingHighlight, setEditingHighlight] = useState<EditingHighlight | null>(null);
  const isScrollingToPage = useRef(false);

  const {
    selectedText,
    selectionRect,
    isSelecting,
    selectionPageNumber,
    selectionRects,
    pageWidth: selPageWidth,
    pageHeight: selPageHeight,
    clearSelection,
  } = useTextSelection(containerRef, { width: pageWidth, height: pageHeight });

  const handleDocumentLoadSuccess = useCallback(
    (pdf: PDFDocumentProxy) => {
      setTotalPages(pdf.numPages);
      onDocumentLoad(pdf);

      // Get first page dimensions
      pdf.getPage(1).then((page) => {
        const viewport = page.getViewport({ scale: 1 });
        setPageWidth(viewport.width);
        setPageHeight(viewport.height);
      });
    },
    [setTotalPages, onDocumentLoad]
  );

  // Scroll mode: IntersectionObserver for tracking visible pages
  useEffect(() => {
    if (viewMode !== 'scroll' || totalPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingToPage.current) return;

        const visible = new Set(visiblePages);
        let topMostVisiblePage = Infinity;
        let topMostRatio = 0;

        for (const entry of entries) {
          const pageNum = parseInt(entry.target.getAttribute('data-page-sentinel') || '0', 10);
          if (pageNum === 0) continue;

          if (entry.isIntersecting) {
            visible.add(pageNum);
            if (pageNum < topMostVisiblePage || (pageNum === topMostVisiblePage && entry.intersectionRatio > topMostRatio)) {
              topMostVisiblePage = pageNum;
              topMostRatio = entry.intersectionRatio;
            }
          } else {
            visible.delete(pageNum);
          }
        }

        setVisiblePages(visible);

        // Update current page to the most visible one
        if (topMostVisiblePage !== Infinity) {
          // Find the page with the most visibility in the top half of the viewport
          const scrollEl = scrollContainerRef.current;
          if (scrollEl) {
            const viewportMid = scrollEl.scrollTop + scrollEl.clientHeight / 3;
            let closestPage = topMostVisiblePage;
            let closestDist = Infinity;

            for (const pg of visible) {
              const el = pageRefs.current.get(pg);
              if (el) {
                const elMid = el.offsetTop + el.clientHeight / 2;
                const dist = Math.abs(elMid - viewportMid);
                if (dist < closestDist) {
                  closestDist = dist;
                  closestPage = pg;
                }
              }
            }
            setCurrentPage(closestPage);
          }
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    // Observe all page sentinels
    const sentinels = scrollContainerRef.current?.querySelectorAll('[data-page-sentinel]');
    sentinels?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [viewMode, totalPages, setCurrentPage]);

  // Scroll to page when currentPage changes (from external navigation)
  const scrollToPageRef = useRef(currentPage);
  useEffect(() => {
    if (viewMode !== 'scroll') return;
    if (currentPage === scrollToPageRef.current) return;
    scrollToPageRef.current = currentPage;

    const el = pageRefs.current.get(currentPage);
    if (el && scrollContainerRef.current) {
      isScrollingToPage.current = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        isScrollingToPage.current = false;
      }, 500);
    }
  }, [currentPage, viewMode]);

  // Update visible pages for scroll mode based on current page
  useEffect(() => {
    if (viewMode !== 'scroll') return;
    const buffer = 2;
    const newVisible = new Set<number>();
    for (let i = Math.max(1, currentPage - buffer); i <= Math.min(totalPages, currentPage + buffer); i++) {
      newVisible.add(i);
    }
    setVisiblePages((prev) => {
      // Merge: keep previously visible pages if they are still close
      const merged = new Set(newVisible);
      for (const p of prev) {
        if (Math.abs(p - currentPage) <= buffer + 1) {
          merged.add(p);
        }
      }
      return merged;
    });
  }, [currentPage, totalPages, viewMode]);

  const handleHighlightClick = useCallback(
    (annotation: AnnotationResponse, domRect: DOMRect) => {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      setEditingHighlight({
        annotation,
        rect: {
          top: domRect.top - containerRect.top,
          left: domRect.left - containerRect.left + domRect.width / 2,
        },
      });
    },
    []
  );

  const handleCreateHighlight = useCallback(
    (color: 'yellow' | 'green' | 'blue' | 'pink', note?: string) => {
      if (!selectionPageNumber || !selectedText) return;

      onCreateHighlight({
        pageNumber: selectionPageNumber,
        selectedText,
        note,
        color,
        positionData: {
          rects: selectionRects,
          pageWidth: selPageWidth,
          pageHeight: selPageHeight,
        },
      });
      clearSelection();
    },
    [selectionPageNumber, selectedText, selectionRects, selPageWidth, selPageHeight, onCreateHighlight, clearSelection]
  );

  // Search result highlight page
  const searchHighlightPage = useMemo(() => {
    if (searchResults.length > 0 && currentSearchIndex >= 0) {
      return searchResults[currentSearchIndex];
    }
    return null;
  }, [searchResults, currentSearchIndex]);

  const scaledWidth = pageWidth * zoom;
  const scaledHeight = pageHeight * zoom;
  const pageGap = 16;

  const allPages = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages]
  );

  if (viewMode === 'page') {
    return (
      <div ref={containerRef} className="relative flex-1 flex items-center justify-center overflow-auto bg-bg-app">
        {/* Popover for new highlight */}
        {isSelecting && selectionRect && (
          <HighlightPopover
            mode="new"
            top={selectionRect.top}
            left={selectionRect.left}
            onCreateHighlight={handleCreateHighlight}
            onClose={clearSelection}
          />
        )}

        {/* Popover for editing highlight */}
        {editingHighlight && (
          <HighlightPopover
            mode="edit"
            top={editingHighlight.rect.top}
            left={editingHighlight.rect.left}
            annotation={editingHighlight.annotation}
            onUpdateHighlight={onUpdateHighlight}
            onDeleteHighlight={(id) => {
              onDeleteHighlight(id);
              setEditingHighlight(null);
            }}
            onClose={() => setEditingHighlight(null)}
          />
        )}

        <button
          className="absolute left-4 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-md hover:bg-white transition-colors cursor-pointer disabled:opacity-20"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="relative" data-page-number={currentPage}>
          <Document file={fileUrl} onLoadSuccess={handleDocumentLoadSuccess} loading={<PageLoading />}>
            <Page
              pageNumber={currentPage}
              scale={zoom}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={<PageLoading width={scaledWidth} height={scaledHeight} />}
            />
          </Document>
          <HighlightLayer
            annotations={annotations}
            pageNumber={currentPage}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            zoom={zoom}
            onHighlightClick={handleHighlightClick}
          />
        </div>

        <button
          className="absolute right-4 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-md hover:bg-white transition-colors cursor-pointer disabled:opacity-20"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Scroll mode
  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden bg-bg-app">
      {/* Popover for new highlight */}
      {isSelecting && selectionRect && (
        <HighlightPopover
          mode="new"
          top={selectionRect.top}
          left={selectionRect.left}
          onCreateHighlight={handleCreateHighlight}
          onClose={clearSelection}
        />
      )}

      {/* Popover for editing highlight */}
      {editingHighlight && (
        <HighlightPopover
          mode="edit"
          top={editingHighlight.rect.top}
          left={editingHighlight.rect.left}
          annotation={editingHighlight.annotation}
          onUpdateHighlight={onUpdateHighlight}
          onDeleteHighlight={(id) => {
            onDeleteHighlight(id);
            setEditingHighlight(null);
          }}
          onClose={() => setEditingHighlight(null)}
        />
      )}

      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-auto overflow-x-auto"
      >
        <Document file={fileUrl} onLoadSuccess={handleDocumentLoadSuccess} loading={<PageLoading />}>
          <div className="flex flex-col items-center py-4" style={{ gap: pageGap }}>
            {allPages.map((pageNum) => {
              const isVisible = visiblePages.has(pageNum);
              const isSearchHighlight = searchHighlightPage === pageNum;

              return (
                <div
                  key={pageNum}
                  ref={(el) => {
                    if (el) pageRefs.current.set(pageNum, el);
                    else pageRefs.current.delete(pageNum);
                  }}
                  data-page-sentinel={pageNum}
                  data-page-number={pageNum}
                  className="relative"
                  style={{
                    width: scaledWidth,
                    minHeight: scaledHeight,
                  }}
                >
                  {isSearchHighlight && (
                    <div
                      className="absolute inset-0 z-10 pointer-events-none rounded-sm"
                      style={{
                        boxShadow: '0 0 0 3px rgba(255, 152, 0, 0.5)',
                      }}
                    />
                  )}
                  {isVisible ? (
                    <>
                      <Page
                        pageNumber={pageNum}
                        scale={zoom}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        loading={
                          <div
                            className="bg-white shadow-sm flex items-center justify-center"
                            style={{ width: scaledWidth, height: scaledHeight }}
                          >
                            <Loader2 className="w-6 h-6 text-text-secondary animate-spin" />
                          </div>
                        }
                      />
                      <HighlightLayer
                        annotations={annotations}
                        pageNumber={pageNum}
                        pageWidth={pageWidth}
                        pageHeight={pageHeight}
                        zoom={zoom}
                        onHighlightClick={handleHighlightClick}
                      />
                    </>
                  ) : (
                    <div
                      className="bg-white shadow-sm"
                      style={{ width: scaledWidth, height: scaledHeight }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </Document>
      </div>
    </div>
  );
}

function PageLoading({ width, height }: { width?: number; height?: number }) {
  return (
    <div
      className="bg-white shadow-sm flex items-center justify-center"
      style={{ width: width || 612, height: height || 792 }}
    >
      <Loader2 className="w-8 h-8 text-text-secondary animate-spin" />
    </div>
  );
}
