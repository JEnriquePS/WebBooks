import type { AnnotationResponse } from '../../types';

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: 'rgba(255, 241, 118, 0.4)',
  green: 'rgba(165, 214, 167, 0.4)',
  blue: 'rgba(144, 202, 249, 0.4)',
  pink: 'rgba(244, 143, 177, 0.4)',
};

interface HighlightLayerProps {
  annotations: AnnotationResponse[];
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  zoom: number;
  onHighlightClick: (annotation: AnnotationResponse, rect: DOMRect) => void;
}

export function HighlightLayer({
  annotations,
  pageNumber,
  pageWidth,
  pageHeight,
  zoom,
  onHighlightClick,
}: HighlightLayerProps) {
  const pageAnnotations = annotations.filter((a) => a.pageNumber === pageNumber);

  if (pageAnnotations.length === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ width: pageWidth * zoom, height: pageHeight * zoom }}
    >
      {pageAnnotations.map((annotation) =>
        annotation.positionData.rects.map((rect, i) => {
          const x = rect.x * pageWidth * zoom;
          const y = rect.y * pageHeight * zoom;
          const w = rect.width * pageWidth * zoom;
          const h = rect.height * pageHeight * zoom;

          return (
            <div
              key={`${annotation.id}-${i}`}
              className="absolute cursor-pointer pointer-events-auto rounded-sm transition-opacity hover:opacity-80"
              style={{
                left: x,
                top: y,
                width: w,
                height: h,
                backgroundColor: HIGHLIGHT_COLORS[annotation.color] || HIGHLIGHT_COLORS.yellow,
                mixBlendMode: 'multiply',
              }}
              onClick={(e) => {
                e.stopPropagation();
                const target = e.currentTarget;
                onHighlightClick(annotation, target.getBoundingClientRect());
              }}
            />
          );
        })
      )}
    </div>
  );
}
