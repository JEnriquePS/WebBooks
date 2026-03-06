import { useNavigate } from 'react-router-dom';
import { Star, Pencil } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { getErrorMessage } from '../../lib/errorMessages';
import type { BookResponse } from '../../types';

interface BookListItemProps {
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

export default function BookListItem({ book, onEdit }: BookListItemProps) {
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
  const fileSizeMB = (book.fileSize / (1024 * 1024)).toFixed(1);

  return (
    <div
      className="group flex items-center gap-4 bg-white rounded-lg border border-border/60 shadow-sm hover:shadow-md transition-all duration-200 p-3 cursor-pointer"
      onClick={() => navigate(`/reader/${book.id}`)}
    >
      <div className="w-12 h-16 rounded-md overflow-hidden flex-shrink-0 bg-bg-sidebar">
        {book.coverUrl ? (
          <img
            src={api.getBookThumbnail(book.id)}
            alt={book.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: getCoverColor(book.id) }}
          >
            <span className="text-[8px] font-medium text-text-primary/70 text-center px-0.5 line-clamp-2">
              {book.title}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary truncate">
            {book.title}
          </h3>
          {isFinished && (
            <span className="flex-shrink-0 px-2 py-0.5 bg-green-600 text-white text-[10px] font-medium rounded-full">
              Terminado
            </span>
          )}
        </div>
        {(book.author || book.year) && (
          <p className="text-xs text-text-secondary truncate">
            {[book.author, book.year].filter(Boolean).join(' \u00B7 ')}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {percentage > 0 && !isFinished && (
            <div className="flex items-center gap-2 flex-1 max-w-48">
              <div className="flex-1 h-1 bg-border/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-[10px] text-text-secondary">{Math.round(percentage)}%</span>
            </div>
          )}
          <span className="text-[10px] text-text-secondary">{fileSizeMB} MB</span>
          {book.totalPages && (
            <span className="text-[10px] text-text-secondary">{book.totalPages} pags.</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            favoriteMutation.mutate();
          }}
          className={`p-1.5 rounded-full transition-all duration-200 cursor-pointer ${
            book.isFavorite
              ? 'text-yellow-500 hover:bg-yellow-50'
              : 'text-text-secondary hover:bg-bg-sidebar'
          }`}
          title={book.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          <Star className="w-4 h-4" fill={book.isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(book);
          }}
          className="p-1.5 rounded-full text-text-secondary hover:bg-bg-sidebar transition-all duration-200 cursor-pointer"
          title="Editar metadatos"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
