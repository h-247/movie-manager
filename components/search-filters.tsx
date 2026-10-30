import React from 'react';
import { Search, X, SlidersHorizontal, ArrowUpDown, Bookmark } from 'lucide-react';
import type { WatchStatus } from '@/db/schema';

interface SearchFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  mediaType: string;
  onMediaTypeChange: (type: string) => void;
  genre: string;
  onGenreChange: (genre: string) => void;
  year: string;
  onYearChange: (year: string) => void;
  sortBy: string;
  onSortByChange: (sortBy: string) => void;
  availableGenres: { name: string; count: number }[];
  totalResults: number;
  onResetFilters: () => void;
}

export function SearchFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  mediaType,
  onMediaTypeChange,
  genre,
  onGenreChange,
  year,
  onYearChange,
  sortBy,
  onSortByChange,
  availableGenres,
  totalResults,
  onResetFilters,
}: SearchFiltersProps) {
  const isFiltered = !!(
    search ||
    (status && status !== 'ALL') ||
    (mediaType && mediaType !== 'ALL') ||
    genre
  );

  const activeGenres = availableGenres.filter((g) => g.count > 0);

  const sortOptions = [
    { value: 'added_desc', label: 'Recently added' },
    { value: 'added_asc', label: 'Oldest added' },
    { value: 'title_asc', label: 'Title A–Z' },
    { value: 'title_desc', label: 'Title Z–A' },
    { value: 'year_desc', label: 'Release year (newest)' },
    { value: 'year_asc', label: 'Release year (oldest)' },
  ];

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-[#262626] p-2.5 sm:p-3">
      {/* Main Filter Row: Search Input + Media Type Filter + Sort By Dropdown */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, original title, or IMDb ID..."
            className="w-full rounded-lg border border-neutral-800 bg-[#1A1A1A] py-1.5 pl-8 pr-8 text-xs text-[#ECECEC] placeholder-neutral-500 transition-colors focus:border-neutral-600 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Media Type Filter (All / Movies / Series) */}
        <div className="flex items-center rounded-lg bg-[#1A1A1A] p-0.5 border border-neutral-800 shrink-0">
          {(
            [
              { id: 'ALL', label: 'All' },
              { id: 'MOVIE', label: 'Movies' },
              { id: 'SERIES', label: 'Series' },
            ] as const
          ).map((t) => {
            const isSelected = mediaType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onMediaTypeChange(t.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-neutral-700 text-white shadow-sm font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Sort By Dropdown */}
        <div className="relative shrink-0">
          <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
            <ArrowUpDown className="h-3 w-3" />
          </div>
          <select
            value={sortBy}
            aria-label="Sort movies by"
            onChange={(e) => onSortByChange(e.target.value)}
            className="cursor-pointer appearance-none rounded-lg border border-neutral-800 bg-[#1A1A1A] py-1.5 pl-7 pr-6 text-xs font-medium text-[#ECECEC] transition-colors focus:border-neutral-600 focus:outline-none"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#1A1A1A]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Filter Button if filtered */}
        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1 rounded-lg bg-[#333333] px-2 py-1 text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors shrink-0"
          >
            <X className="h-3 w-3" />
            <span>Reset</span>
          </button>
        )}

        {/* Total Results */}
        <span className="text-xs text-neutral-400 shrink-0 ml-auto hidden sm:inline">
          {totalResults} {totalResults === 1 ? 'title' : 'titles'}
        </span>
      </div>

      {/* Genre Filter Tabs (Only active genres with count > 0) */}
      {activeGenres.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none border-t border-neutral-800/60 pt-2 text-xs">
          <span className="text-xs font-semibold text-purple-300 flex items-center gap-1 shrink-0 mr-1">
            <Bookmark className="w-3 h-3 text-purple-400" />
            Genre:
          </span>
          <button
            type="button"
            onClick={() => onGenreChange('')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              !genre
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-[#1A1A1A] text-purple-300 hover:text-white border border-purple-500/25 hover:border-purple-500/50'
            }`}
          >
            <span>All</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                !genre ? 'bg-purple-700 text-white' : 'bg-[#2a2a2a] text-purple-300'
              }`}
            >
              {activeGenres.reduce((acc, curr) => acc + curr.count, 0)}
            </span>
          </button>

          {activeGenres.map((g) => {
            const isSelected = genre.toLowerCase() === g.name.toLowerCase();
            return (
              <button
                key={g.name}
                type="button"
                onClick={() => onGenreChange(isSelected ? '' : g.name)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-[#1A1A1A] text-purple-300 hover:text-white border border-purple-500/25 hover:border-purple-500/50'
                }`}
              >
                <span>{g.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected ? 'bg-purple-700 text-white' : 'bg-[#2a2a2a] text-purple-300'
                  }`}
                >
                  {g.count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
