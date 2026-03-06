import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useLibraryStore } from '../../stores/libraryStore';

export default function SearchBar() {
  const { searchQuery, setSearch } = useLibraryStore();
  const [localValue, setLocalValue] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(localValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [localValue, setSearch]);

  useEffect(() => {
    if (searchQuery === '' && localValue !== '') {
      setLocalValue('');
    }
  }, [searchQuery]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder="Buscar libros..."
        className="w-full pl-9 pr-9 py-2 rounded-lg bg-bg-sidebar border border-border text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200"
      />
      {localValue && (
        <button
          onClick={() => setLocalValue('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
