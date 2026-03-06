import { useState, useRef, useEffect } from 'react';
import { X, Upload, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { getErrorMessage } from '../../lib/errorMessages';
import type { BookResponse } from '../../types';

interface MetadataEditModalProps {
  book: BookResponse;
  onClose: () => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function MetadataEditModal({ book, onClose }: MetadataEditModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author ?? '');
  const [description, setDescription] = useState(book.description ?? '');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [deleteCover, setDeleteCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPdfMetadata, setShowPdfMetadata] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const updateMetadataMutation = useMutation({
    mutationFn: (data: { title?: string; author?: string | null; description?: string | null }) =>
      api.updateBookMetadata(book.id, data),
  });

  const uploadCoverMutation = useMutation({
    mutationFn: (file: File) => api.uploadCover(book.id, file),
  });

  const deleteCoverMutation = useMutation({
    mutationFn: () => api.deleteCover(book.id),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Formato no soportado. Usa JPG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('La imagen es demasiado grande. El limite es 2 MB.');
      return;
    }

    setCoverFile(file);
    setDeleteCover(false);
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  };

  const handleRestoreCover = () => {
    setCoverFile(null);
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
      setCoverPreview(null);
    }
    setDeleteCover(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('El titulo no puede estar vacio.');
      return;
    }

    setSaving(true);
    try {
      await updateMetadataMutation.mutateAsync({
        title: title.trim(),
        author: author.trim() || null,
        description: description.trim() || null,
      });

      if (coverFile) {
        await uploadCoverMutation.mutateAsync(coverFile);
      } else if (deleteCover) {
        await deleteCoverMutation.mutateAsync();
      }

      queryClient.invalidateQueries({ queryKey: ['library'] });
      toast.success('Metadatos actualizados correctamente.');
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  const currentCoverSrc = coverPreview
    ? coverPreview
    : deleteCover
      ? null
      : book.coverUrl
        ? api.getBookThumbnail(book.id)
        : null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Editar metadatos</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-bg-sidebar transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-20 h-28 rounded-lg overflow-hidden bg-bg-sidebar flex-shrink-0 border border-border/60">
              {currentCoverSrc ? (
                <img src={currentCoverSrc} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-secondary/40 text-xs text-center p-1">
                  Sin portada
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-bg-sidebar border border-border rounded-lg hover:bg-border/50 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Cambiar portada
              </button>
              {(book.coverUrl || coverFile) && (
                <button
                  onClick={handleRestoreCover}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurar original
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Titulo</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Autor</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Autor desconocido"
              className="w-full px-3 py-2 rounded-lg border border-border text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Descripcion</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Sin descripcion"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all resize-none"
            />
          </div>
        </div>

        {book.pdfMetadata && (
          <div className="px-5 pb-4">
            <button
              type="button"
              onClick={() => setShowPdfMetadata(!showPdfMetadata)}
              className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              {showPdfMetadata ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Metadata original del PDF
            </button>
            {showPdfMetadata && (
              <div className="mt-2 space-y-1.5 pl-5">
                {([
                  ['Titulo PDF', book.pdfMetadata.title],
                  ['Autor PDF', book.pdfMetadata.author],
                  ['Tema', book.pdfMetadata.subject],
                  ['Palabras clave', book.pdfMetadata.keywords],
                  ['Creador', book.pdfMetadata.creator],
                  ['Productor', book.pdfMetadata.producer],
                  ['Fecha de creacion', book.pdfMetadata.creationDate],
                  ['Fecha de modificacion', book.pdfMetadata.modDate],
                ] as const).map(([label, value]) =>
                  value ? (
                    <div key={label} className="flex gap-2 text-xs">
                      <span className="text-text-secondary/60 flex-shrink-0">{label}:</span>
                      <span className="text-text-secondary break-all">{value}</span>
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 p-5 border-t border-border">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors rounded-lg cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
