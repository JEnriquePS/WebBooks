import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { AnnotationResponse } from '../../types';

const COLORS: Array<{ name: 'yellow' | 'green' | 'blue' | 'pink'; hex: string }> = [
  { name: 'yellow', hex: '#FFF176' },
  { name: 'green', hex: '#A5D6A7' },
  { name: 'blue', hex: '#90CAF9' },
  { name: 'pink', hex: '#F48FB1' },
];

interface NewHighlightPopoverProps {
  mode: 'new';
  top: number;
  left: number;
  onCreateHighlight: (color: 'yellow' | 'green' | 'blue' | 'pink', note?: string) => void;
  onClose: () => void;
}

interface EditHighlightPopoverProps {
  mode: 'edit';
  top: number;
  left: number;
  annotation: AnnotationResponse;
  onUpdateHighlight: (id: string, data: { note?: string; color?: 'yellow' | 'green' | 'blue' | 'pink' }) => void;
  onDeleteHighlight: (id: string) => void;
  onClose: () => void;
}

type HighlightPopoverProps = NewHighlightPopoverProps | EditHighlightPopoverProps;

export function HighlightPopover(props: HighlightPopoverProps) {
  const { mode, top, left, onClose } = props;

  if (mode === 'new') {
    return (
      <NewPopover
        top={top}
        left={left}
        onCreateHighlight={props.onCreateHighlight}
        onClose={onClose}
      />
    );
  }

  return (
    <EditPopover
      top={top}
      left={left}
      annotation={props.annotation}
      onUpdateHighlight={props.onUpdateHighlight}
      onDeleteHighlight={props.onDeleteHighlight}
      onClose={onClose}
    />
  );
}

function NewPopover({
  top,
  left,
  onCreateHighlight,
  onClose,
}: {
  top: number;
  left: number;
  onCreateHighlight: (color: 'yellow' | 'green' | 'blue' | 'pink', note?: string) => void;
  onClose: () => void;
}) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');

  return (
    <div
      data-highlight-popover
      className="absolute z-50 bg-white rounded-xl shadow-lg border border-border p-3 min-w-[200px]"
      style={{
        top: top - 10,
        left: left,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="flex items-center gap-2 justify-center">
        {COLORS.map((c) => (
          <button
            key={c.name}
            className="w-7 h-7 rounded-full border-2 border-transparent hover:border-gray-400 transition-colors cursor-pointer"
            style={{ backgroundColor: c.hex }}
            onClick={() => {
              if (showNote && note.trim()) {
                onCreateHighlight(c.name, note.trim());
              } else {
                onCreateHighlight(c.name);
              }
              onClose();
            }}
            title={c.name}
          />
        ))}
      </div>

      {!showNote ? (
        <button
          className="mt-2 w-full text-sm text-accent hover:text-accent/80 transition-colors cursor-pointer"
          onClick={() => setShowNote(true)}
        >
          Añadir nota
        </button>
      ) : (
        <div className="mt-2">
          <textarea
            className="w-full border border-border rounded-lg p-2 text-sm resize-none focus:outline-none focus:border-accent"
            rows={3}
            placeholder="Escribe una nota..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
          />
          <button
            className="mt-1 w-full text-sm bg-accent text-white rounded-lg py-1.5 hover:bg-accent/90 transition-colors cursor-pointer"
            onClick={() => {
              // User needs to click a color to save
            }}
          >
            Selecciona un color para guardar
          </button>
        </div>
      )}

      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white" />
    </div>
  );
}

function EditPopover({
  top,
  left,
  annotation,
  onUpdateHighlight,
  onDeleteHighlight,
  onClose,
}: {
  top: number;
  left: number;
  annotation: AnnotationResponse;
  onUpdateHighlight: (id: string, data: { note?: string; color?: 'yellow' | 'green' | 'blue' | 'pink' }) => void;
  onDeleteHighlight: (id: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState(annotation.note || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSaveNote = () => {
    if (note.trim() !== (annotation.note || '')) {
      onUpdateHighlight(annotation.id, { note: note.trim() || undefined });
    }
  };

  return (
    <div
      data-highlight-popover
      className="absolute z-50 bg-white rounded-xl shadow-lg border border-border p-3 min-w-[260px] max-w-[320px]"
      style={{
        top: top - 10,
        left: left,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <p className="text-sm text-text-primary line-clamp-2 mb-2 italic">
        &ldquo;{annotation.selectedText}&rdquo;
      </p>

      <div className="flex items-center gap-2 mb-2">
        {COLORS.map((c) => (
          <button
            key={c.name}
            className={`w-6 h-6 rounded-full border-2 transition-colors cursor-pointer ${
              annotation.color === c.name ? 'border-gray-600 scale-110' : 'border-transparent hover:border-gray-400'
            }`}
            style={{ backgroundColor: c.hex }}
            onClick={() => {
              if (annotation.color !== c.name) {
                onUpdateHighlight(annotation.id, { color: c.name });
              }
            }}
            title={c.name}
          />
        ))}
      </div>

      <textarea
        className="w-full border border-border rounded-lg p-2 text-sm resize-none focus:outline-none focus:border-accent"
        rows={2}
        placeholder="Añadir nota..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={handleSaveNote}
      />

      <div className="flex items-center justify-between mt-2">
        {!confirmDelete ? (
          <button
            className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 transition-colors cursor-pointer"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              className="text-sm text-red-600 font-medium hover:text-red-800 cursor-pointer"
              onClick={() => {
                onDeleteHighlight(annotation.id);
                onClose();
              }}
            >
              Confirmar
            </button>
            <button
              className="text-sm text-text-secondary hover:text-text-primary cursor-pointer"
              onClick={() => setConfirmDelete(false)}
            >
              Cancelar
            </button>
          </div>
        )}
        <button
          className="text-sm text-text-secondary hover:text-text-primary cursor-pointer"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white" />
    </div>
  );
}
