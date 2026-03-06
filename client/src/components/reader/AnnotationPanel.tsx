import { useMemo } from 'react';
import { Download, Highlighter } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { getErrorMessage } from '../../lib/errorMessages';
import { useReaderStore } from '../../stores/readerStore';
import type { AnnotationResponse } from '../../types';

const COLOR_MAP: Record<string, string> = {
  yellow: '#FFF176',
  green: '#A5D6A7',
  blue: '#90CAF9',
  pink: '#F48FB1',
};

interface AnnotationPanelProps {
  bookId: string;
  annotations: AnnotationResponse[];
  isLoading: boolean;
}

export function AnnotationPanel({ bookId, annotations, isLoading }: AnnotationPanelProps) {
  const setCurrentPage = useReaderStore((s) => s.setCurrentPage);

  const grouped = useMemo(() => {
    const map = new Map<number, AnnotationResponse[]>();
    const sorted = [...annotations].sort((a, b) => a.pageNumber - b.pageNumber);
    for (const ann of sorted) {
      const existing = map.get(ann.pageNumber);
      if (existing) {
        existing.push(ann);
      } else {
        map.set(ann.pageNumber, [ann]);
      }
    }
    return map;
  }, [annotations]);

  const handleExport = async () => {
    try {
      const blob = await api.exportAnnotations(bookId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `annotations-${bookId}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Anotaciones exportadas');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold text-text-primary">Anotaciones</h3>
        <button
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-30"
          onClick={handleExport}
          disabled={annotations.length === 0}
          title="Exportar anotaciones"
        >
          <Download className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : annotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-text-secondary">
            <Highlighter className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No hay anotaciones en este libro</p>
            <p className="text-xs mt-1 opacity-60">
              Selecciona texto para crear una
            </p>
          </div>
        ) : (
          <div className="py-2">
            {Array.from(grouped.entries()).map(([pageNum, pageAnnotations]) => (
              <div key={pageNum} className="mb-3">
                <div className="px-4 py-1">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Página {pageNum}
                  </span>
                </div>
                {pageAnnotations.map((ann) => (
                  <button
                    key={ann.id}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => setCurrentPage(ann.pageNumber)}
                  >
                    <div className="flex gap-2">
                      <div
                        className="w-1 shrink-0 rounded-full self-stretch"
                        style={{ backgroundColor: COLOR_MAP[ann.color] || COLOR_MAP.yellow }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-primary line-clamp-2">
                          &ldquo;{ann.selectedText}&rdquo;
                        </p>
                        {ann.note && (
                          <p className="text-xs text-text-secondary italic mt-1 line-clamp-1">
                            {ann.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
