import { useEffect, useRef, useCallback } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useReaderStore } from '../../stores/readerStore';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface SearchBarProps {
  pdfDocument: PDFDocumentProxy | null;
}

export function SearchBar({ pdfDocument }: SearchBarProps) {
  const searchOpen = useReaderStore((s) => s.searchOpen);
  const searchQuery = useReaderStore((s) => s.searchQuery);
  const searchResults = useReaderStore((s) => s.searchResults);
  const currentSearchIndex = useReaderStore((s) => s.currentSearchIndex);
  const setSearchQuery = useReaderStore((s) => s.setSearchQuery);
  const setSearchResults = useReaderStore((s) => s.setSearchResults);
  const nextSearchResult = useReaderStore((s) => s.nextSearchResult);
  const prevSearchResult = useReaderStore((s) => s.prevSearchResult);
  const toggleSearch = useReaderStore((s) => s.toggleSearch);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  const performSearch = useCallback(
    async (query: string) => {
      if (!pdfDocument || !query.trim()) {
        setSearchResults([]);
        return;
      }

      const normalizedQuery = query.toLowerCase().trim();
      const matchingPages: number[] = [];

      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .toLowerCase();

        if (pageText.includes(normalizedQuery)) {
          matchingPages.push(i);
        }
      }

      setSearchResults(matchingPages);
    },
    [pdfDocument, setSearchResults]
  );

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  if (!searchOpen) return null;

  return (
    <div className="absolute top-14 left-0 right-0 z-40 bg-white border-b border-border shadow-sm animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2 px-4 py-2 max-w-2xl mx-auto">
        <Search className="w-4 h-4 text-text-secondary shrink-0" />
        <input
          ref={inputRef}
          type="text"
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-text-secondary"
          placeholder="Buscar en el documento..."
          value={searchQuery}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (e.shiftKey) {
                prevSearchResult();
              } else {
                nextSearchResult();
              }
            }
            if (e.key === 'Escape') {
              toggleSearch();
            }
          }}
        />

        {searchQuery && (
          <span className="text-xs text-text-secondary whitespace-nowrap tabular-nums">
            {searchResults.length > 0
              ? `${currentSearchIndex + 1} de ${searchResults.length} resultados`
              : 'Sin resultados'}
          </span>
        )}

        <div className="flex items-center gap-0.5">
          <button
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors cursor-pointer"
            onClick={prevSearchResult}
            disabled={searchResults.length === 0}
            title="Resultado anterior"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors cursor-pointer"
            onClick={nextSearchResult}
            disabled={searchResults.length === 0}
            title="Siguiente resultado"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <button
          className="p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
          onClick={toggleSearch}
          title="Cerrar búsqueda"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
