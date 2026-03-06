import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useReaderStore } from '../../stores/readerStore';

interface ThumbnailSidebarProps {
  fileUrl: string;
}

export function ThumbnailSidebar({ fileUrl }: ThumbnailSidebarProps) {
  const totalPages = useReaderStore((s) => s.totalPages);
  const currentPage = useReaderStore((s) => s.currentPage);
  const setCurrentPage = useReaderStore((s) => s.setCurrentPage);

  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

  const THUMB_HEIGHT = 180;
  const THUMB_GAP = 8;
  const ITEM_HEIGHT = THUMB_HEIGHT + THUMB_GAP + 20; // thumbnail + gap + page number

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const viewHeight = container.clientHeight;
      const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 3);
      const end = Math.min(totalPages, Math.ceil((scrollTop + viewHeight) / ITEM_HEIGHT) + 3);
      setVisibleRange({ start, end });
    };

    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [totalPages]);

  // Scroll to current page thumbnail
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targetScroll = (currentPage - 1) * ITEM_HEIGHT;
    const viewHeight = container.clientHeight;
    const scrollTop = container.scrollTop;

    if (targetScroll < scrollTop || targetScroll > scrollTop + viewHeight - ITEM_HEIGHT) {
      container.scrollTo({
        top: targetScroll - viewHeight / 2 + ITEM_HEIGHT / 2,
        behavior: 'smooth',
      });
    }
  }, [currentPage]);

  const handleThumbnailClick = useCallback(
    (page: number) => {
      setCurrentPage(page);
    },
    [setCurrentPage]
  );

  if (totalPages === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div ref={containerRef} className="overflow-y-auto h-full p-3">
      <Document file={fileUrl} loading={null}>
        <div
          className="relative"
          style={{ height: totalPages * ITEM_HEIGHT }}
        >
          {pages.map((pageNum) => {
            const isVisible =
              pageNum - 1 >= visibleRange.start && pageNum - 1 <= visibleRange.end;

            return (
              <div
                key={pageNum}
                className="absolute left-0 right-0 flex flex-col items-center"
                style={{
                  top: (pageNum - 1) * ITEM_HEIGHT,
                  height: ITEM_HEIGHT,
                }}
              >
                <button
                  className={`rounded-lg overflow-hidden border-2 transition-colors cursor-pointer ${
                    currentPage === pageNum
                      ? 'border-accent shadow-md'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                  onClick={() => handleThumbnailClick(pageNum)}
                >
                  {isVisible ? (
                    <Page
                      pageNumber={pageNum}
                      width={120}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={
                        <div
                          className="bg-gray-100 animate-pulse"
                          style={{ width: 120, height: THUMB_HEIGHT - 10 }}
                        />
                      }
                    />
                  ) : (
                    <div
                      className="bg-gray-50"
                      style={{ width: 120, height: THUMB_HEIGHT - 10 }}
                    />
                  )}
                </button>
                <span
                  className={`text-xs mt-1 tabular-nums ${
                    currentPage === pageNum
                      ? 'text-accent font-medium'
                      : 'text-text-secondary'
                  }`}
                >
                  {pageNum}
                </span>
              </div>
            );
          })}
        </div>
      </Document>
    </div>
  );
}
