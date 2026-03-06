import { useState, useRef, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { useReaderStore } from '../../stores/readerStore';

export function PageNavigator() {
  const currentPage = useReaderStore((s) => s.currentPage);
  const totalPages = useReaderStore((s) => s.totalPages);
  const setCurrentPage = useReaderStore((s) => s.setCurrentPage);

  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = () => {
    const page = parseInt(inputValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5">
        <FileText className="w-4 h-4 text-text-secondary" />
        <input
          ref={inputRef}
          type="number"
          className="w-14 h-7 text-center text-sm border border-accent rounded-md focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          value={inputValue}
          min={1}
          max={totalPages}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          onBlur={handleSubmit}
        />
        <span className="text-sm text-text-secondary">/ {totalPages}</span>
      </div>
    );
  }

  return (
    <button
      className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
      onClick={() => {
        setInputValue(String(currentPage));
        setIsEditing(true);
      }}
      title="Ir a página"
    >
      <FileText className="w-4 h-4 text-text-secondary" />
      <span className="text-sm font-medium text-text-primary tabular-nums">
        {currentPage}
      </span>
      <span className="text-sm text-text-secondary">/ {totalPages}</span>
    </button>
  );
}
