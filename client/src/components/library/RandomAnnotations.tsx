import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import type { RandomAnnotationResponse } from '../../types';

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: 'border-l-highlight-yellow',
  green: 'border-l-highlight-green',
  blue: 'border-l-highlight-blue',
  pink: 'border-l-highlight-pink',
};

function AnnotationCard({ annotation }: { annotation: RandomAnnotationResponse }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/reader/${annotation.bookId}?page=${annotation.pageNumber}`)}
      className={`flex-shrink-0 w-72 bg-white rounded-lg border border-border/60 shadow-sm hover:shadow-md transition-all duration-200 p-4 text-left border-l-4 ${HIGHLIGHT_COLORS[annotation.color] || 'border-l-highlight-yellow'} cursor-pointer`}
    >
      <p className="text-sm text-text-primary line-clamp-2 mb-1.5 leading-snug">
        &ldquo;{annotation.selectedText}&rdquo;
      </p>
      {annotation.note && (
        <p className="text-xs text-text-secondary italic line-clamp-1 mb-2">
          {annotation.note}
        </p>
      )}
      <div className="flex items-center gap-2 mt-auto">
        {annotation.book.coverUrl && (
          <img
            src={api.getBookThumbnail(annotation.book.id)}
            alt=""
            className="w-6 h-8 rounded-sm object-cover flex-shrink-0"
          />
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-primary truncate">
            {annotation.book.title}
          </p>
          {annotation.book.author && (
            <p className="text-xs text-text-secondary truncate">
              {annotation.book.author}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

export default function RandomAnnotations() {
  const { data: annotations, isLoading } = useQuery({
    queryKey: ['randomAnnotations'],
    queryFn: () => api.getRandomAnnotations(6),
    staleTime: 60000,
  });

  if (isLoading || !annotations || annotations.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-accent" />
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
          Redescubre tus notas
        </h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {annotations.map((annotation) => (
          <AnnotationCard key={annotation.id} annotation={annotation} />
        ))}
      </div>
    </div>
  );
}
