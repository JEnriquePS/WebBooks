import { create } from 'zustand';

export type LibraryFilter = 'all' | 'recent' | 'favorites' | 'in-progress' | 'finished';
export type ViewMode = 'grid' | 'list';

interface LibraryState {
  activeFilter: LibraryFilter;
  searchQuery: string;
  viewMode: ViewMode;
  currentFolder: string;
  setFilter: (filter: LibraryFilter) => void;
  setSearch: (query: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setFolder: (folder: string) => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  activeFilter: 'all',
  searchQuery: '',
  viewMode: 'grid',
  currentFolder: '',
  setFilter: (filter) => set({ activeFilter: filter }),
  setSearch: (query) => set({ searchQuery: query }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setFolder: (folder) => set({ currentFolder: folder }),
}));
