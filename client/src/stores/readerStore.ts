import { create } from 'zustand';

interface ReaderState {
  currentPage: number;
  totalPages: number;
  zoom: number;
  viewMode: 'scroll' | 'page';
  leftSidebarOpen: boolean;
  leftSidebarTab: 'toc' | 'thumbnails';
  rightSidebarOpen: boolean;
  searchOpen: boolean;
  searchQuery: string;
  searchResults: number[];
  currentSearchIndex: number;

  setCurrentPage: (page: number) => void;
  setTotalPages: (total: number) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setViewMode: (mode: 'scroll' | 'page') => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarTab: (tab: 'toc' | 'thumbnails') => void;
  toggleSearch: () => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: number[]) => void;
  nextSearchResult: () => void;
  prevSearchResult: () => void;
  reset: () => void;
}

const initialState = {
  currentPage: 1,
  totalPages: 0,
  zoom: 1.0,
  viewMode: 'scroll' as const,
  leftSidebarOpen: false,
  leftSidebarTab: 'toc' as const,
  rightSidebarOpen: false,
  searchOpen: false,
  searchQuery: '',
  searchResults: [] as number[],
  currentSearchIndex: -1,
};

export const useReaderStore = create<ReaderState>((set) => ({
  ...initialState,

  setCurrentPage: (page) => set({ currentPage: page }),
  setTotalPages: (total) => set({ totalPages: total }),
  setZoom: (zoom) => set({ zoom: Math.min(3.0, Math.max(0.5, zoom)) }),
  zoomIn: () =>
    set((state) => ({ zoom: Math.min(3.0, state.zoom + 0.25) })),
  zoomOut: () =>
    set((state) => ({ zoom: Math.max(0.5, state.zoom - 0.25) })),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleLeftSidebar: () =>
    set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
  toggleRightSidebar: () =>
    set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),
  setLeftSidebarTab: (tab) =>
    set({ leftSidebarTab: tab, leftSidebarOpen: true }),
  toggleSearch: () =>
    set((state) => ({
      searchOpen: !state.searchOpen,
      ...(state.searchOpen
        ? { searchQuery: '', searchResults: [], currentSearchIndex: -1 }
        : {}),
    })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) =>
    set({ searchResults: results, currentSearchIndex: results.length > 0 ? 0 : -1 }),
  nextSearchResult: () =>
    set((state) => {
      if (state.searchResults.length === 0) return {};
      const next = (state.currentSearchIndex + 1) % state.searchResults.length;
      return { currentSearchIndex: next, currentPage: state.searchResults[next] };
    }),
  prevSearchResult: () =>
    set((state) => {
      if (state.searchResults.length === 0) return {};
      const prev =
        state.currentSearchIndex <= 0
          ? state.searchResults.length - 1
          : state.currentSearchIndex - 1;
      return { currentSearchIndex: prev, currentPage: state.searchResults[prev] };
    }),
  reset: () => set(initialState),
}));
