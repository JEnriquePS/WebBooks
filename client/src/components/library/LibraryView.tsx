import { Fragment } from 'react';
import { BookOpen, LayoutGrid, List, FolderSync, Home, ChevronRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { getErrorMessage } from '../../lib/errorMessages';
import { useLibraryStore } from '../../stores/libraryStore';
import RandomAnnotations from './RandomAnnotations';
import FilterBar from './FilterBar';
import SearchBar from './SearchBar';
import BookGrid from './BookGrid';

export default function LibraryView() {
  const { viewMode, setViewMode, currentFolder, setFolder } = useLibraryStore();
  const queryClient = useQueryClient();

  const segments = currentFolder ? currentFolder.split('/') : [];

  const scanMutation = useMutation({
    mutationFn: () => api.scanLibrary(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      if (data.added > 0 || data.removed > 0) {
        toast.success(
          `Biblioteca actualizada: ${data.added} agregado(s), ${data.removed} eliminado(s).`
        );
      } else {
        toast.info('La biblioteca ya esta actualizada.');
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  return (
    <div className="min-h-screen bg-bg-app">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-accent" strokeWidth={1.8} />
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">WebBooks</h1>
          </div>
          <button
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-accent border border-border rounded-lg hover:border-accent/30 transition-all duration-200 cursor-pointer disabled:opacity-50"
            title="Escanear biblioteca"
          >
            <FolderSync className={`w-3.5 h-3.5 ${scanMutation.isPending ? 'animate-spin' : ''}`} />
            Escanear
          </button>
        </header>

        {currentFolder && (
          <nav className="flex items-center gap-1.5 text-sm mb-4">
            <button onClick={() => setFolder('')} className="flex items-center gap-1 text-accent hover:text-accent/80 cursor-pointer">
              <Home className="w-3.5 h-3.5" />
              <span>Biblioteca</span>
            </button>
            {segments.map((segment, i) => (
              <Fragment key={i}>
                <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
                {i === segments.length - 1 ? (
                  <span className="text-text-primary font-medium">{segment}</span>
                ) : (
                  <button
                    onClick={() => setFolder(segments.slice(0, i + 1).join('/'))}
                    className="text-accent hover:text-accent/80 cursor-pointer"
                  >
                    {segment}
                  </button>
                )}
              </Fragment>
            ))}
          </nav>
        )}

        <RandomAnnotations />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <FilterBar />
          <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
            <div className="flex-1 sm:w-64">
              <SearchBar />
            </div>
            <div className="flex items-center bg-bg-sidebar border border-border rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-sm text-accent'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Vista en cuadricula"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white shadow-sm text-accent'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Vista en lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <BookGrid />
      </div>
    </div>
  );
}
