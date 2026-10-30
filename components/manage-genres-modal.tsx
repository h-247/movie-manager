'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  Tag,
  Loader2,
} from 'lucide-react';

export interface MovieGenreItem {
  id: string;
  name: string;
  category: string;
  created_at?: string;
}

interface ManageGenresModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenresChange?: () => void;
}

export function ManageGenresModal({
  isOpen,
  onClose,
  onGenresChange,
}: ManageGenresModalProps) {
  const [genres, setGenres] = useState<MovieGenreItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newGenreName, setNewGenreName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingGenreId, setEditingGenreId] = useState<string | null>(null);
  const [editingGenreName, setEditingGenreName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadGenres = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/genres');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setGenres(data);
        }
      }
    } catch (err: any) {
      console.error('Failed to load movie genres:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadGenres();
      setError(null);
      setEditingGenreId(null);
      setNewGenreName('');
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newGenreName.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/genres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const errData: any = await res.json();
        throw new Error(errData.detail || 'Failed to create movie genre');
      }
      const created: MovieGenreItem = await res.json();
      const updated: MovieGenreItem[] = genres.some((g) => g.id === created.id)
        ? genres
        : [...genres, created].sort((a, b) => a.name.localeCompare(b.name));
      setGenres(updated);
      setNewGenreName('');
      onGenresChange?.();
    } catch (err: any) {
      setError(err.message || 'Failed to create movie genre');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (genreId: string) => {
    const trimmed = editingGenreName.trim();
    if (!trimmed) return;

    try {
      const res = await fetch(`/api/genres/${genreId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const errData: any = await res.json();
        throw new Error(errData.detail || 'Failed to update movie genre');
      }
      const updated: any = await res.json();
      const updatedList: MovieGenreItem[] = genres
        .map((g) => (g.id === genreId ? { ...g, name: updated.name } : g))
        .sort((a, b) => a.name.localeCompare(b.name));
      setGenres(updatedList);
      setEditingGenreId(null);
      onGenresChange?.();
    } catch (err: any) {
      setError(err.message || 'Failed to update movie genre');
    }
  };

  const handleDelete = async (genreId: string) => {
    try {
      const res = await fetch(`/api/genres/${genreId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData: any = await res.json();
        throw new Error(errData.detail || 'Failed to delete movie genre');
      }
      const updatedList = genres.filter((g) => g.id !== genreId);
      setGenres(updatedList);
      onGenresChange?.();
    } catch (err: any) {
      setError(err.message || 'Failed to delete movie genre');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-hidden bg-[#1b1b1b] border border-[#2f2f2f] rounded-2xl shadow-2xl text-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2e2e2e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">CRUD Genres of Movies</h2>
              <p className="text-xs text-gray-400">
                Manage genres in repo genres of movies (Create, Read, Update, Delete)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#282828] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200">
              {error}
            </div>
          )}

          {/* Create New Genre Form */}
          <form
            onSubmit={handleCreate}
            className="p-3.5 rounded-xl bg-[#222222] border border-[#333333] space-y-2.5"
          >
            <label className="text-xs font-bold uppercase tracking-wider text-purple-300 block">
              + Add New Genre to Repo
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGenreName}
                onChange={(e) => setNewGenreName(e.target.value)}
                placeholder="e.g. Science Fiction, Anime, Psychological..."
                className="flex-1 bg-[#161616] border border-[#3e3e3e] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
              />
              <button
                type="submit"
                disabled={isSubmitting || !newGenreName.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Genre</span>
              </button>
            </div>
          </form>

          {/* List of Genres in Repo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-400 px-1">
              <span>Repo Genres of Movies ({genres.length})</span>
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />}
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {genres.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#222222] border border-[#2f2f2f] hover:border-[#3d3d3d] transition-all"
                >
                  {editingGenreId === g.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={editingGenreName}
                        onChange={(e) => setEditingGenreName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate(g.id);
                          if (e.key === 'Escape') setEditingGenreId(null);
                        }}
                        className="flex-1 bg-[#161616] border border-purple-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdate(g.id)}
                        className="p-1 text-emerald-400 hover:text-emerald-300 cursor-pointer"
                        title="Save genre name"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingGenreId(null)}
                        className="p-1 text-gray-400 hover:text-white cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-xs text-gray-100">{g.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGenreId(g.id);
                            setEditingGenreName(g.name);
                          }}
                          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#2c2c2c] transition-colors cursor-pointer"
                          title="Rename genre"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(g.id)}
                          className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Delete genre"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-[#2e2e2e] bg-[#171717]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2a2a2a] hover:bg-[#333333] text-gray-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
