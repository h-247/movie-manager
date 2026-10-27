import React from 'react';
import { Film, Clock, PlayCircle, CheckCircle2 } from 'lucide-react';
import type { WatchStatus } from '@/db/schema';

interface DashboardStatsProps {
  stats: {
    total: number;
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
      label: 'Total Movies',
      count: stats.total,
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
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
            className={`group flex flex-col justify-between rounded-xl border bg-[#262626] p-4 text-left transition-all duration-150 hover:bg-[#2B2B2B] ${
              isActive
                ? `${card.activeBorder} shadow-sm`
                : 'border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                {card.label}
              </span>
              <Icon
                className={`h-4 w-4 transition-transform group-hover:scale-110 ${card.colorClass}`}
              />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-[#ECECEC] sm:text-3xl">
                {isLoading ? (
                  <span className="inline-block h-8 w-12 animate-pulse rounded bg-neutral-800" />
                ) : (
                  card.count
                )}
              </span>
              <span
                className={`h-2 w-2 rounded-full ${card.accentDot} opacity-80`}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
