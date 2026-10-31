import React, { useEffect } from 'react';
import { X, ExternalLink, Film, Shield, Info } from 'lucide-react';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Escape' || e.key === 'Esc') && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-neutral-800 bg-[#262626] p-6 shadow-2xl text-[#ECECEC]">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-neutral-300" />
            <h3 className="text-base font-semibold text-white">
              About Movie & Series Watchlist
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-[#333333] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs leading-relaxed text-neutral-300">
          <p>
            <strong className="text-white">Movie & Series Watchlist Manager</strong> is a
            clean, personal movie and TV series tracking application that synchronizes your
            watching progress across laptops and smartphones.
          </p>

          <div className="rounded-xl border border-neutral-800 bg-[#1A1A1A] p-3.5 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-neutral-400" />
              Three Watching Statuses
            </h4>
            <ul className="space-y-1 text-neutral-400">
              <li>
                <span className="font-semibold text-yellow-400">● To do:</span>{' '}
                Movies you plan to watch in the future.
              </li>
              <li>
                <span className="font-semibold text-blue-400">● Doing:</span>{' '}
                Movies you are currently watching (starts recording watch date).
              </li>
              <li>
                <span className="font-semibold text-green-400">● Done:</span>{' '}
                Movies you have finished watching (records completion date).
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-[#1A1A1A] p-3.5 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-neutral-400" />
              Third-Party Data & TMDB Attribution
            </h4>
            <p className="text-neutral-400">
              Movie metadata (titles, overviews, release dates, and posters) is
              provided via The Movie Database (TMDB) API based on canonical IMDb
              IDs.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://www.themoviedb.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded bg-[#333333] px-2 py-1 text-[11px] font-medium text-white hover:bg-neutral-700 transition-colors"
              >
                The Movie Database (TMDB)
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-[11px] text-neutral-500 italic pt-1">
              "This product uses the TMDB API but is not endorsed or certified by TMDB."
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-neutral-800/80 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
