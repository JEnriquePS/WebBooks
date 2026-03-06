import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  ZoomOut,
  ZoomIn,
  PanelLeftClose,
  PanelRightClose,
  Scroll,
  BookOpen,
} from 'lucide-react';
import { useReaderStore } from '../../stores/readerStore';
import { PageNavigator } from './PageNavigator';

interface ReaderToolbarProps {
  bookTitle: string;
}

export function ReaderToolbar({ bookTitle }: ReaderToolbarProps) {
  const navigate = useNavigate();
  const zoom = useReaderStore((s) => s.zoom);
  const viewMode = useReaderStore((s) => s.viewMode);
  const leftSidebarOpen = useReaderStore((s) => s.leftSidebarOpen);
  const rightSidebarOpen = useReaderStore((s) => s.rightSidebarOpen);
  const searchOpen = useReaderStore((s) => s.searchOpen);
  const zoomIn = useReaderStore((s) => s.zoomIn);
  const zoomOut = useReaderStore((s) => s.zoomOut);
  const setViewMode = useReaderStore((s) => s.setViewMode);
  const toggleLeftSidebar = useReaderStore((s) => s.toggleLeftSidebar);
  const toggleRightSidebar = useReaderStore((s) => s.toggleRightSidebar);
  const toggleSearch = useReaderStore((s) => s.toggleSearch);

  return (
    <div className="h-14 bg-white border-b border-border flex items-center px-3 gap-2 shrink-0 select-none">
      {/* Left section */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
          onClick={() => navigate('/')}
          title="Volver a la biblioteca"
        >
          <ArrowLeft className="w-5 h-5 text-text-primary" />
        </button>
        <span className="text-sm font-medium text-text-primary truncate">
          {bookTitle}
        </span>
      </div>

      {/* Center section */}
      <div className="flex items-center gap-3">
        <PageNavigator />

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              viewMode === 'scroll'
                ? 'bg-white shadow-sm text-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => setViewMode('scroll')}
            title="Desplazamiento continuo"
          >
            <Scroll className="w-4 h-4" />
          </button>
          <button
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              viewMode === 'page'
                ? 'bg-white shadow-sm text-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => setViewMode('page')}
            title="Página por página"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1 flex-1 justify-end">
        <button
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            searchOpen ? 'bg-accent/10 text-accent' : 'hover:bg-gray-100 text-text-secondary'
          }`}
          onClick={toggleSearch}
          title="Buscar (Ctrl+F)"
        >
          <Search className="w-4.5 h-4.5" />
        </button>

        <div className="h-5 w-px bg-border mx-1" />

        <button
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-30"
          onClick={zoomOut}
          disabled={zoom <= 0.5}
          title="Alejar"
        >
          <ZoomOut className="w-4 h-4 text-text-secondary" />
        </button>
        <span className="text-xs font-medium text-text-secondary w-10 text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-30"
          onClick={zoomIn}
          disabled={zoom >= 3.0}
          title="Acercar"
        >
          <ZoomIn className="w-4 h-4 text-text-secondary" />
        </button>

        <div className="h-5 w-px bg-border mx-1" />

        <button
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            leftSidebarOpen ? 'bg-accent/10 text-accent' : 'hover:bg-gray-100 text-text-secondary'
          }`}
          onClick={toggleLeftSidebar}
          title="Panel izquierdo (Ctrl+[)"
        >
          <PanelLeftClose className="w-4.5 h-4.5" />
        </button>
        <button
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            rightSidebarOpen ? 'bg-accent/10 text-accent' : 'hover:bg-gray-100 text-text-secondary'
          }`}
          onClick={toggleRightSidebar}
          title="Panel derecho (Ctrl+])"
        >
          <PanelRightClose className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
}
