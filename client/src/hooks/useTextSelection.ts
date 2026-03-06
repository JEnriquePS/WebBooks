import { useState, useEffect, useCallback, useRef } from 'react';

interface SelectionRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TextSelectionResult {
  selectedText: string;
  selectionRect: SelectionRect | null;
  isSelecting: boolean;
  selectionPageNumber: number | null;
  selectionRects: Array<{ x: number; y: number; width: number; height: number }>;
  pageWidth: number;
  pageHeight: number;
  clearSelection: () => void;
}

export function useTextSelection(containerRef: React.RefObject<HTMLElement | null>, pdfPageDimensions?: { width: number; height: number }): TextSelectionResult {
  const [selectedText, setSelectedText] = useState('');
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionPageNumber, setSelectionPageNumber] = useState<number | null>(null);
  const [selectionRects, setSelectionRects] = useState<Array<{ x: number; y: number; width: number; height: number }>>([]);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const isMouseDown = useRef(false);

  const clearSelection = useCallback(() => {
    setSelectedText('');
    setSelectionRect(null);
    setIsSelecting(false);
    setSelectionPageNumber(null);
    setSelectionRects([]);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = () => {
      isMouseDown.current = true;
    };

    const handleMouseUp = () => {
      isMouseDown.current = false;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        return;
      }

      const text = selection.toString().trim();
      if (!text) return;

      const range = selection.getRangeAt(0);
      const rangeRect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Find the page element containing the selection
      let pageElement: HTMLElement | null = null;
      let node: Node | null = range.startContainer;
      while (node && node !== container) {
        if (node instanceof HTMLElement && node.dataset.pageNumber) {
          pageElement = node;
          break;
        }
        node = node.parentNode;
      }

      if (!pageElement) return;

      const pageNum = parseInt(pageElement.dataset.pageNumber || '0', 10);
      const pageRect = pageElement.getBoundingClientRect();
      const pWidth = pageRect.width;
      const pHeight = pageRect.height;

      // Get individual rects for the selection (for highlight positioning)
      const clientRects = range.getClientRects();
      const normalizedRects: Array<{ x: number; y: number; width: number; height: number }> = [];
      for (let i = 0; i < clientRects.length; i++) {
        const r = clientRects[i];
        normalizedRects.push({
          x: (r.left - pageRect.left) / pWidth,
          y: (r.top - pageRect.top) / pHeight,
          width: r.width / pWidth,
          height: r.height / pHeight,
        });
      }

      setSelectedText(text);
      setSelectionRect({
        top: rangeRect.top - containerRect.top,
        left: rangeRect.left - containerRect.left + rangeRect.width / 2,
        width: rangeRect.width,
        height: rangeRect.height,
      });
      setIsSelecting(true);
      setSelectionPageNumber(pageNum);
      setSelectionRects(normalizedRects);
      // Use original PDF dimensions (in points) for storage, not zoomed pixel dimensions
      setPageWidth(pdfPageDimensions?.width || pWidth);
      setPageHeight(pdfPageDimensions?.height || pHeight);
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseup', handleMouseUp);
    };
  }, [containerRef]);

  // Close on click outside
  useEffect(() => {
    if (!isSelecting) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't clear if clicking on the popover itself
      if (target.closest('[data-highlight-popover]')) return;
      clearSelection();
    };

    // Delay adding listener so the mouseup that triggers selection doesn't immediately clear it
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSelecting, clearSelection]);

  return {
    selectedText,
    selectionRect,
    isSelecting,
    selectionPageNumber,
    selectionRects,
    pageWidth,
    pageHeight,
    clearSelection,
  };
}
