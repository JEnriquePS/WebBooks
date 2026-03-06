import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookX, Library, Folder } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { getErrorMessage } from '../../lib/errorMessages';
import { useLibraryStore } from '../../stores/libraryStore';
import BookCard from './BookCard';
import BookListItem from './BookListItem';
import MetadataEditModal from './MetadataEditModal';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import type { BookResponse } from '../../types';

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-border/60 overflow-hidden">
          <Skeleton className="aspect-[3/2] rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 bg-white rounded-lg border border-border/60 p-3">
          <Skeleton className="w-12 h-16 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BookGrid() {
  const { activeFilter, searchQuery, viewMode, currentFolder, setFolder } = useLibraryStore();
  const [editingBook, setEditingBook] = useState<BookResponse | null>(null);

  const showFolders = activeFilter === 'all' && !searchQuery;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['library', activeFilter, searchQuery, showFolders ? currentFolder : undefined],
    queryFn: () =>
      api.getLibrary({
        filter: activeFilter,
        search: searchQuery || undefined,
        folder: showFolders ? currentFolder : undefined,
      }),
  });

  if (isError) {
    toast.error(getErrorMessage(error));
  }

  if (isLoading) {
    return viewMode === 'grid' ? <GridSkeleton /> : <ListSkeleton />;
  }

  const books = data?.books ?? [];
  const folders = showFolders ? (data?.folders ?? []) : [];

  if (books.length === 0 && folders.length === 0) {
    if (searchQuery) {
      return (
        <EmptyState
          icon={BookX}
          title="Sin resultados"
          description={`No se encontraron libros para "${searchQuery}". Intenta con otro termino de busqueda.`}
        />
      );
    }
    return (
      <EmptyState
        icon={Library}
        title="Tu biblioteca esta vacia"
        description="Agrega archivos PDF a la carpeta de tu biblioteca para comenzar a leer."
      />
    );
  }

  return (
    <>
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {folders.map((folderName) => {
            const fullFolderPath = currentFolder ? `${currentFolder}/${folderName}` : folderName;
            return (
              <button
                key={`folder-${folderName}`}
                onClick={() => setFolder(fullFolderPath)}
                className="flex flex-col items-center justify-center gap-2 p-6 bg-white rounded-lg border border-border/60 hover:border-accent/30 hover:shadow-md transition-all duration-200 cursor-pointer aspect-[3/2]"
              >
                <Folder className="w-12 h-12 text-accent/70" strokeWidth={1.5} />
                <span className="text-sm font-medium text-text-primary text-center line-clamp-2">{folderName}</span>
              </button>
            );
          })}
          {books.map((book) => (
            <BookCard key={book.id} book={book} onEdit={setEditingBook} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {folders.map((folderName) => {
            const fullFolderPath = currentFolder ? `${currentFolder}/${folderName}` : folderName;
            return (
              <button
                key={`folder-${folderName}`}
                onClick={() => setFolder(fullFolderPath)}
                className="flex items-center gap-4 w-full bg-white rounded-lg border border-border/60 hover:border-accent/30 hover:shadow-md transition-all duration-200 cursor-pointer p-3"
              >
                <Folder className="w-10 h-10 text-accent/70 flex-shrink-0" strokeWidth={1.5} />
                <span className="text-sm font-medium text-text-primary">{folderName}</span>
              </button>
            );
          })}
          {books.map((book) => (
            <BookListItem key={book.id} book={book} onEdit={setEditingBook} />
          ))}
        </div>
      )}

      {editingBook && (
        <MetadataEditModal book={editingBook} onClose={() => setEditingBook(null)} />
      )}
    </>
  );
}
