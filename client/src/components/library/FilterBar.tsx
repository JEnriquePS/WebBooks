import { useLibraryStore, type LibraryFilter } from '../../stores/libraryStore';

const FILTERS: { key: LibraryFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'recent', label: 'Recientes' },
  { key: 'favorites', label: 'Favoritos' },
  { key: 'in-progress', label: 'En progreso' },
  { key: 'finished', label: 'Terminados' },
];

export default function FilterBar() {
  const { activeFilter, setFilter } = useLibraryStore();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {FILTERS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setFilter(key)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
            activeFilter === key
              ? 'bg-accent text-white shadow-sm'
              : 'bg-bg-sidebar text-text-secondary hover:bg-border/50'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
