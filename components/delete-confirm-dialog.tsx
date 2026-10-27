import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { Movie } from '@/db/schema';

interface DeleteConfirmDialogProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (movieId: string) => Promise<void>;
}

export function DeleteConfirmDialog({
  movie,
  isOpen,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !movie) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(movie.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-neutral-800 bg-[#262626] p-6 shadow-2xl text-[#ECECEC]">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">
              Delete Movie from Watchlist?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-neutral-300">
              Are you sure you want to permanently remove{' '}
              <span className="font-semibold text-white">"{movie.title}"</span>{' '}
              ({movie.imdbId}) from your collection? This will delete all tracking
              dates, personal ratings, and notes.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-neutral-800/80 pt-4">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="rounded-lg bg-[#333333] px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors shadow-sm disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDeleting ? 'Deleting...' : 'Delete Movie'}
          </button>
        </div>
      </div>
    </div>
  );
}
