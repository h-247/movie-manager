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
    genre ||
    year
  );

  const sortOptions = [
    { value: 'added_desc', label: 'Recently added' },
    { value: 'added_asc', label: 'Oldest added' },
    { value: 'title_asc', label: 'Title A–Z' },
    { value: 'title_desc', label: 'Title Z–A' },
    { value: 'year_desc', label: 'Release year (newest)' },
    { value: 'year_asc', label: 'Release year (oldest)' },
    { value: 'updated_desc', label: 'Recently updated' },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-[#262626] p-3 sm:p-4">
      {/* Top row: Search Bar & Sort Dropdown */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, original title, or IMDb ID (e.g. tt0111161)..."
            className="w-full rounded-lg border border-neutral-800 bg-[#1A1A1A] py-2 pl-9 pr-9 text-sm text-[#ECECEC] placeholder-neutral-500 transition-colors focus:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sort By Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[170px] sm:w-auto">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <ArrowUpDown className="h-3.5 w-3.5" />
            </div>
            <select
              value={sortBy}
              aria-label="Sort movies by"
              onChange={(e) => onSortByChange(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-lg border border-neutral-800 bg-[#1A1A1A] py-2 pl-8 pr-8 text-xs font-medium text-[#ECECEC] transition-colors focus:border-neutral-600 focus:outline-none"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#1A1A1A]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Second row: Status Filter Buttons, Genre Dropdown, Year Filter, Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-neutral-800/80">
        {/* Status Pill Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onStatusChange('ALL')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              status === 'ALL'
                ? 'bg-white text-black'
                : 'bg-[#1A1A1A] text-neutral-300 border border-neutral-800 hover:bg-[#333333]'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onStatusChange('TO_DO')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              status === 'TO_DO'
                ? 'bg-yellow-400 text-black font-semibold'
                : 'bg-[#1A1A1A] text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/10'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === 'TO_DO' ? 'bg-black' : 'bg-yellow-400'
              }`}
            />
            To do
          </button>
          <button
            type="button"
            onClick={() => onStatusChange('DOING')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              status === 'DOING'
                ? 'bg-blue-400 text-black font-semibold'
                : 'bg-[#1A1A1A] text-blue-300 border border-blue-500/30 hover:bg-blue-500/10'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === 'DOING' ? 'bg-black' : 'bg-blue-400'
              }`}
            />
            Doing
          </button>
          <button
            type="button"
            onClick={() => onStatusChange('DONE')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              status === 'DONE'
                ? 'bg-green-400 text-black font-semibold'
                : 'bg-[#1A1A1A] text-green-300 border border-green-500/30 hover:bg-green-500/10'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === 'DONE' ? 'bg-black' : 'bg-green-400'
              }`}
            />
            Done
          </button>
        </div>

        {/* Media Type Filter (All / Movies / Series) */}
        <div className="flex items-center rounded-lg bg-[#1A1A1A] p-0.5 border border-neutral-800">
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

        {/* Right side: Genre Filter, Year, and Reset */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Genre Dropdown */}
          <select
            value={genre}
            aria-label="Filter by genre"
            onChange={(e) => onGenreChange(e.target.value)}
            className="rounded-lg border border-neutral-800 bg-[#1A1A1A] py-1 px-2.5 text-xs text-neutral-300 transition-colors focus:border-neutral-600 focus:outline-none"
          >
            <option value="">All Genres</option>
            {availableGenres.map((g) => (
              <option key={g.name} value={g.name} className="bg-[#1A1A1A]">
                {g.name} ({g.count})
              </option>
            ))}
          </select>

          {/* Year Filter */}
          <input
            type="number"
            min="1888"
            max="2100"
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
            placeholder="Year..."
            aria-label="Filter by release year"
            className="w-20 rounded-lg border border-neutral-800 bg-[#1A1A1A] py-1 px-2 text-xs text-neutral-300 placeholder-neutral-500 transition-colors focus:border-neutral-600 focus:outline-none"
          />

          {/* Reset Filters */}
          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              className="flex items-center gap-1 rounded-lg bg-[#333333] px-2.5 py-1 text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
            >
              <X className="h-3 w-3" />
              Reset
            </button>
          )}

          <span className="text-xs text-neutral-400 ml-1">
            {totalResults} {totalResults === 1 ? 'movie' : 'movies'}
          </span>
        </div>
      </div>

      {/* Genre Filter Tabs (matching english-grammar-quiz) */}
      {availableGenres.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none border-t border-neutral-800/80 pt-2.5">
          <span className="text-xs font-semibold text-purple-300 flex items-center gap-1 shrink-0 min-w-[52px]">
            <Bookmark className="w-3.5 h-3.5 text-purple-400" />
            Genre:
          </span>
          <button
            type="button"
            onClick={() => onGenreChange('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              !genre
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-[#1A1A1A] text-purple-300 hover:text-white border border-purple-500/25 hover:border-purple-500/50'
            }`}
          >
            <span>All Genres</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                !genre ? 'bg-purple-700 text-white' : 'bg-[#2a2a2a] text-purple-300'
              }`}
            >
              {availableGenres.reduce((acc, curr) => acc + curr.count, 0)}
            </span>
          </button>

          {availableGenres.map((g) => {
            const isSelected = genre.toLowerCase() === g.name.toLowerCase();
            return (
              <button
                key={g.name}
                type="button"
                onClick={() => onGenreChange(isSelected ? '' : g.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
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
