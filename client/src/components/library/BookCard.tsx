import { useNavigate } from 'react-router-dom';
import { Star, Pencil, BookOpen, FileText } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { getErrorMessage } from '../../lib/errorMessages';
import type { BookResponse } from '../../types';

interface BookCardProps {
  book: BookResponse;
  onEdit: (book: BookResponse) => void;
}

const COVER_COLORS = ['#E8D5B7', '#B7C9E8', '#D5E8B7', '#E8B7D5', '#C9B7E8', '#E8C9B7'];

function getCoverColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return COVER_COLORS[Math.abs(hash) % COVER_COLORS.length];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BookCard({ book, onEdit }: BookCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const favoriteMutation = useMutation({
    mutationFn: () => api.toggleFavorite(book.id, !book.isFavorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const percentage = book.progress?.percentage ?? 0;
  const isFinished = book.progress?.isFinished ?? false;

  return (
    <div className="group relative bg-white rounded-lg border border-border/60 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <button
        onClick={() => navigate(`/reader/${book.id}`)}
        className="w-full text-left cursor-pointer"
      >
        {/* Smaller cover: aspect-[3/2] landscape instead of aspect-[2/3] portrait */}
        <div className="relative aspect-[3/2] bg-bg-sidebar overflow-hidden">
          {book.coverUrl ? (
            <img
              src={api.getBookThumbnail(book.id)}
              alt={book.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center p-3"
              style={{ backgroundColor: getCoverColor(book.id) }}
            >
              <span className="text-center text-sm font-medium text-text-primary/70 line-clamp-3">
                {book.title}
              </span>
            </div>
          )}
          {isFinished && (
            <span className="absolute top-2 left-2 px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded-full">
              Terminado
            </span>
          )}
        </div>

        {/* Expanded details section */}
        <div className="p-3 space-y-1.5">
          <h3 className="text-sm font-semibold text-text-primary line-clamp-2 leading-snug">
            {book.title}
          </h3>
          {(book.author || book.year) && (
            <p className="text-xs text-text-secondary truncate">
              {[book.author, book.year].filter(Boolean).join(' \u00B7 ')}
            </p>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-2 text-[11px] text-text-secondary/80">
            {book.totalPages && (
              <span className="flex items-center gap-0.5">
                <BookOpen className="w-3 h-3" />
                {book.totalPages} pág
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <FileText className="w-3 h-3" />
              {formatFileSize(book.fileSize)}
            </span>
          </div>

          {/* Progress bar */}
          {percentage > 0 && !isFinished && (
            <div>
              <div className="w-full h-1 bg-border/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-[10px] text-text-secondary mt-0.5">{Math.round(percentage)}%</p>
            </div>
          )}
        </div>
      </button>

      {/* Hover action buttons */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            favoriteMutation.mutate();
          }}
          className={`p-1.5 rounded-full backdrop-blur-sm transition-all duration-200 cursor-pointer ${
            book.isFavorite
              ? 'bg-yellow-400/90 text-white'
              : 'bg-black/40 text-white hover:bg-black/60'
          }`}
          title={book.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          <Star className="w-3.5 h-3.5" fill={book.isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(book);
          }}
          className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-all duration-200 cursor-pointer"
          title="Editar metadatos"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
