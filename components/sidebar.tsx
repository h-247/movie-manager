import React from 'react';
import {
  PanelLeft,
  PanelLeftClose,
  Plus,
  Tag,
  Search,
  X,
  ArrowUpDown,
  Bookmark,
  Film,
  Clock,
  PlayCircle,
  CheckCircle2,
  Library,
  RefreshCw,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onOpenImport: () => void;
  onOpenManageGenres: () => void;
  onSyncAllSeries?: () => void;
  isSyncingAll?: boolean;
  stats: {
    total: number;
    totalMovies?: number;
    totalSeries?: number;
    todo: number;
    doing: number;
    done: number;
    genres?: { name: string; count: number }[];
  };
  isLoadingStats?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  mediaType: string;
  onMediaTypeChange: (type: string) => void;
  genre: string;
  onGenreChange: (genre: string) => void;
  year?: string;
  onYearChange?: (year: string) => void;
  sortBy: string;
  onSortByChange: (sortBy: string) => void;
  availableGenres: { name: string; count: number }[];
  totalResults: number;
  onResetFilters: () => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  onClose,
  onOpenImport,
  onOpenManageGenres,
  onSyncAllSeries,
  isSyncingAll = false,
  stats,
  isLoadingStats = false,
  search,
  onSearchChange,
  status,
  onStatusChange,
  mediaType,
  onMediaTypeChange,
  genre,
  onGenreChange,
  sortBy,
  onSortByChange,
  availableGenres,
  totalResults,
  onResetFilters,
}: SidebarProps) {
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

  const statusCards = [
    {
      id: 'ALL',
      label: 'Total',
      count: stats.total,
      subtitle:
        stats.totalMovies !== undefined && stats.totalSeries !== undefined
          ? `${stats.totalMovies}m • ${stats.totalSeries}s`
          : undefined,
      icon: Film,
      colorClass: 'text-neutral-200',
      activeBorder: 'border-white/80 ring-1 ring-white/30 bg-[#2A2A2A]',
      accentDot: 'bg-neutral-400',
    },
    {
      id: 'TO_DO',
      label: 'To do',
      count: stats.todo,
      icon: Clock,
      colorClass: 'text-yellow-400',
      activeBorder: 'border-yellow-400/80 ring-1 ring-yellow-400/30 bg-yellow-400/10',
      accentDot: 'bg-yellow-400',
    },
    {
      id: 'DOING',
      label: 'Doing',
      count: stats.doing,
      icon: PlayCircle,
      colorClass: 'text-blue-400',
      activeBorder: 'border-blue-400/80 ring-1 ring-blue-400/30 bg-blue-400/10',
      accentDot: 'bg-blue-400',
    },
    {
      id: 'DONE',
      label: 'Done',
      count: stats.done,
      icon: CheckCircle2,
      colorClass: 'text-green-400',
      activeBorder: 'border-green-400/80 ring-1 ring-green-400/30 bg-green-400/10',
      accentDot: 'bg-green-400',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Expanded Sidebar Drawer / Container (hidden when closed) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col border-r border-neutral-800 bg-[#171717] text-[#ECECEC] transition-all duration-200 ease-in-out md:sticky md:top-0 md:z-20 ${
          isOpen
            ? 'translate-x-0 md:w-72'
            : '-translate-x-full md:hidden'
        }`}
      >
        <div className="flex h-full w-72 flex-col justify-between overflow-y-auto p-3.5 scrollbar-thin scrollbar-thumb-neutral-800">
          <div className="space-y-3.5">
            {/* Top Bar with Sidebar Toggle (like Book Manager) */}
            <div className="flex items-center justify-between pb-1 px-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Movies
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#262626] text-neutral-300 border border-neutral-700">
                  {totalResults}
                </span>
              </div>

              <button
                type="button"
                onClick={onToggle}
                title="Close sidebar (Alt+1)"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
              >
                <PanelLeftClose className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="space-y-1.5">
              {/* + Import Title (styled like ChatGPT + New chat) */}
              <button
                type="button"
                onClick={onOpenImport}
                title="Import Title (Alt+`)"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black shadow-sm hover:bg-neutral-200 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Import Title</span>
              </button>

              {/* Genres of Movies CRUD Button */}
              <button
                type="button"
                onClick={onOpenManageGenres}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-[#222222] px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-[#2c2c2c] hover:text-white transition-colors"
              >
                <Tag className="h-3.5 w-3.5 text-purple-400" />
                <span>Genres of Movies</span>
              </button>

              {/* Sync Series with IMDb Button */}
              {onSyncAllSeries && (
                <button
                  type="button"
                  onClick={onSyncAllSeries}
                  disabled={isSyncingAll}
                  title="Check IMDb for new seasons & episodes on all series"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-[#222222] px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-[#2c2c2c] hover:text-white transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 text-cyan-400 ${
                      isSyncingAll ? 'animate-spin' : ''
                    }`}
                  />
                  <span>
                    {isSyncingAll ? 'Syncing Series...' : 'Sync Series with IMDb'}
                  </span>
                </button>
              )}
            </div>

            {/* Section: Search Input */}
            <div className="relative pt-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search titles, IMDb ID..."
                className="w-full rounded-lg border border-neutral-800 bg-[#212121] py-1.5 pl-8 pr-8 text-xs text-[#ECECEC] placeholder-neutral-500 transition-colors focus:border-neutral-600 focus:outline-none"
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

            {/* Section: Status Cards (TOTAL, TO DO, DOING, DONE) */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Watch Status
              </div>
              <div className="grid grid-cols-2 gap-2">
                {statusCards.map((card) => {
                  const Icon = card.icon;
                  const isActive = status === card.id;

                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => {
                        if (isActive && card.id !== 'ALL') {
                          onStatusChange('ALL');
                        } else {
                          onStatusChange(card.id);
                        }
                      }}
                      className={`flex flex-col justify-between rounded-lg border p-2 text-left transition-all ${
                        isActive
                          ? `${card.activeBorder} shadow-sm`
                          : 'border-neutral-800 bg-[#212121] hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={`h-3.5 w-3.5 ${card.colorClass}`} />
                        <span className={`h-1.5 w-1.5 rounded-full ${card.accentDot}`} />
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-[11px] font-medium text-neutral-300">
                          {card.label}
                        </span>
                        <span className="text-sm font-bold text-white">
                          {isLoadingStats ? (
                            <span className="inline-block h-3.5 w-4 animate-pulse rounded bg-neutral-800" />
                          ) : (
                            card.count
                          )}
                        </span>
                      </div>
                      {card.subtitle && (
                        <span className="text-[9px] text-neutral-500 truncate">
                          {card.subtitle}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section: Media Type & Sort Filters */}
            <div className="space-y-2 pt-1 border-t border-neutral-800/80">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Filter & Sort
              </div>

              {/* Media Type Tabs (All / Movies / Series) */}
              <div className="flex items-center rounded-lg bg-[#212121] p-0.5 border border-neutral-800">
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
                      className={`flex-1 rounded-md py-1 text-center text-xs font-medium transition-colors ${
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
              <div className="relative">
                <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
                  <ArrowUpDown className="h-3 w-3" />
                </div>
                <select
                  value={sortBy}
                  aria-label="Sort movies by"
                  onChange={(e) => onSortByChange(e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-lg border border-neutral-800 bg-[#212121] py-1.5 pl-7 pr-6 text-xs font-medium text-[#ECECEC] transition-colors focus:border-neutral-600 focus:outline-none"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#212121]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section: Genre Filter */}
            {activeGenres.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-neutral-800/80">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-purple-300">
                    <Bookmark className="h-3 w-3 text-purple-400" />
                    Genres
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {activeGenres.reduce((acc, curr) => acc + curr.count, 0)} total
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800 pr-1">
                  <button
                    type="button"
                    onClick={() => onGenreChange('')}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                      !genre
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-[#212121] text-purple-300 hover:text-white border border-purple-500/25 hover:border-purple-500/50'
                    }`}
                  >
                    <span>All</span>
                    <span
                      className={`rounded-full px-1 text-[10px] ${
                        !genre ? 'bg-purple-700 text-white' : 'bg-neutral-800 text-purple-300'
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
                        className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-[#212121] text-purple-300 hover:text-white border border-purple-500/25 hover:border-purple-500/50'
                        }`}
                      >
                        <span>{g.name}</span>
                        <span
                          className={`rounded-full px-1 text-[10px] ${
                            isSelected ? 'bg-purple-700 text-white' : 'bg-neutral-800 text-purple-300'
                          }`}
                        >
                          {g.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bottom of Sidebar: Reset Filters, User Avatar & Summary */}
          <div className="pt-3 border-t border-neutral-800/80 space-y-2.5">
            {isFiltered && (
              <button
                type="button"
                onClick={onResetFilters}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#262626] border border-neutral-700 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset all filters</span>
              </button>
            )}

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div
                  title="Toàn (H2)"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-[11px] font-bold text-white shadow-sm ring-1 ring-orange-500/50 shrink-0"
                >
                  H2
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-white truncate">Toàn</span>
                  <span className="text-[10px] text-neutral-500 truncate">
                    {totalResults} {totalResults === 1 ? 'title' : 'titles'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
