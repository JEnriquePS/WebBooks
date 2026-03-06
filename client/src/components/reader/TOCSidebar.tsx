import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, List } from 'lucide-react';
import { useReaderStore } from '../../stores/readerStore';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface OutlineItem {
  title: string;
  dest: string | unknown[] | null;
  items: OutlineItem[];
  bold: boolean;
  italic: boolean;
  pageNumber?: number;
}

interface TOCSidebarProps {
  pdfDocument: PDFDocumentProxy | null;
}

export function TOCSidebar({ pdfDocument }: TOCSidebarProps) {
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasOutline, setHasOutline] = useState(true);

  useEffect(() => {
    if (!pdfDocument) return;

    const loadOutline = async () => {
      try {
        setLoading(true);
        const rawOutline = await pdfDocument.getOutline();
        if (!rawOutline || rawOutline.length === 0) {
          setHasOutline(false);
          setLoading(false);
          return;
        }

        // Resolve page numbers for outline items
        const resolvePageNumbers = async (items: OutlineItem[]): Promise<OutlineItem[]> => {
          const resolved: OutlineItem[] = [];
          for (const item of items) {
            let pageNumber: number | undefined;
            if (item.dest) {
              try {
                let dest: unknown[] | null = null;
                if (typeof item.dest === 'string') {
                  dest = await pdfDocument.getDestination(item.dest);
                } else if (Array.isArray(item.dest)) {
                  dest = item.dest;
                }
                if (Array.isArray(dest) && dest[0]) {
                  const ref = dest[0];
                  const pageIndex = await pdfDocument.getPageIndex(ref as never);
                  pageNumber = pageIndex + 1;
                }
              } catch {
                // Skip items with unresolvable destinations
              }
            }
            const children = item.items ? await resolvePageNumbers(item.items) : [];
            resolved.push({ ...item, pageNumber, items: children });
          }
          return resolved;
        };

        const resolvedOutline = await resolvePageNumbers(rawOutline as unknown as OutlineItem[]);
        setOutline(resolvedOutline);
        setHasOutline(true);
      } catch {
        setHasOutline(false);
      } finally {
        setLoading(false);
      }
    };

    loadOutline();
  }, [pdfDocument]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasOutline) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-text-secondary">
        <List className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">Este PDF no tiene tabla de contenidos</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full py-2">
      {outline.map((item, i) => (
        <TOCItem key={i} item={item} depth={0} />
      ))}
    </div>
  );
}

function TOCItem({ item, depth }: { item: OutlineItem; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const currentPage = useReaderStore((s) => s.currentPage);
  const setCurrentPage = useReaderStore((s) => s.setCurrentPage);
  const hasChildren = item.items && item.items.length > 0;
  const isActive = item.pageNumber === currentPage;

  const handleClick = useCallback(() => {
    if (item.pageNumber) {
      setCurrentPage(item.pageNumber);
    }
  }, [item.pageNumber, setCurrentPage]);

  return (
    <div>
      <button
        className={`w-full flex items-center gap-1 px-3 py-1.5 text-left text-sm transition-colors cursor-pointer group ${
          isActive
            ? 'bg-accent/10 text-accent font-medium'
            : 'text-text-primary hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={handleClick}
      >
        {hasChildren && (
          <button
            className="p-0.5 rounded hover:bg-gray-200 shrink-0 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            <ChevronRight
              className={`w-3 h-3 text-text-secondary transition-transform ${
                expanded ? 'rotate-90' : ''
              }`}
            />
          </button>
        )}
        {!hasChildren && <span className="w-4" />}
        <span className="truncate flex-1">{item.title}</span>
        {item.pageNumber && (
          <span className="text-xs text-text-secondary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
            {item.pageNumber}
          </span>
        )}
      </button>
      {hasChildren && expanded && (
        <div>
          {item.items.map((child, i) => (
            <TOCItem key={i} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
