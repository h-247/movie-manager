import React from 'react';
import { Film, Clock, PlayCircle, CheckCircle2 } from 'lucide-react';
import type { WatchStatus } from '@/db/schema';

interface DashboardStatsProps {
  stats: {
    total: number;
    totalMovies?: number;
    totalSeries?: number;
    todo: number;
    doing: number;
    done: number;
  };
  activeStatus: string;
  onSelectStatus: (status: string) => void;
  isLoading?: boolean;
}

export function DashboardStats({
  stats,
  activeStatus,
  onSelectStatus,
  isLoading = false,
}: DashboardStatsProps) {
  const cards = [
    {
      id: 'ALL',
      label: 'Total',
      count: stats.total,
      subtitle:
        stats.totalMovies !== undefined && stats.totalSeries !== undefined
          ? `${stats.totalMovies} movies • ${stats.totalSeries} series`
          : undefined,
      icon: Film,
      colorClass: 'text-neutral-200',
      activeBorder: 'border-white ring-1 ring-white/20',
      accentDot: 'bg-neutral-400',
    },
    {
      id: 'TO_DO',
      label: 'To do',
      count: stats.todo,
      icon: Clock,
      colorClass: 'text-yellow-400',
      activeBorder: 'border-yellow-400 ring-1 ring-yellow-400/30',
      accentDot: 'bg-yellow-400',
    },
    {
      id: 'DOING',
      label: 'Doing',
      count: stats.doing,
      icon: PlayCircle,
      colorClass: 'text-blue-400',
      activeBorder: 'border-blue-400 ring-1 ring-blue-400/30',
      accentDot: 'bg-blue-400',
    },
    {
      id: 'DONE',
      label: 'Done',
      count: stats.done,
      icon: CheckCircle2,
      colorClass: 'text-green-400',
      activeBorder: 'border-green-400 ring-1 ring-green-400/30',
      accentDot: 'bg-green-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeStatus === card.id;

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => {
              if (isActive && card.id !== 'ALL') {
                onSelectStatus('ALL');
              } else {
                onSelectStatus(card.id);
              }
            }}
            className={`group flex items-center justify-between rounded-lg border bg-[#262626] px-3 py-1.5 text-left transition-all duration-150 hover:bg-[#2B2B2B] ${
              isActive
                ? `${card.activeBorder} bg-[#2F2F2F]`
                : 'border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Icon className={`h-3.5 w-3.5 shrink-0 ${card.colorClass}`} />
              <div className="min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block truncate">
                  {card.label}
                </span>
                {card.subtitle && (
                  <span className="text-[10px] text-neutral-500 block truncate">
                    {card.subtitle}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 pl-1.5">
              <span className="text-sm sm:text-base font-bold text-white">
                {isLoading ? (
                  <span className="inline-block h-4 w-6 animate-pulse rounded bg-neutral-800" />
                ) : (
                  card.count
                )}
              </span>
              <span className={`h-1.5 w-1.5 rounded-full ${card.accentDot}`} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
