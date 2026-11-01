import React from 'react';
import type { WatchStatus } from '@/db/schema';

interface StatusBadgeProps {
  status: WatchStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: (e?: React.MouseEvent) => void;
}

export function StatusBadge({
  status,
  size = 'md',
  className = '',
  onClick,
}: StatusBadgeProps) {
  const config = {
    TO_DO: {
      label: 'To do',
      dotColor: 'bg-yellow-400',
      badgeClass:
        'bg-yellow-500/15 text-yellow-300 border-yellow-500/30 hover:border-yellow-500/50',
    },
    DOING: {
      label: 'Doing',
      dotColor: 'bg-blue-400',
      badgeClass:
        'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:border-blue-500/50',
    },
    DONE: {
      label: 'Done',
      dotColor: 'bg-green-400',
      badgeClass:
        'bg-green-500/15 text-green-300 border-green-500/30 hover:border-green-500/50',
    },
  }[status] || {
    label: status,
    dotColor: 'bg-neutral-400',
    badgeClass: 'bg-neutral-500/15 text-neutral-300 border-neutral-500/30',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-medium',
  }[size];

  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`inline-flex items-center shrink-0 whitespace-nowrap rounded-full border transition-colors ${config.badgeClass} ${sizeClasses} ${
        onClick ? 'cursor-pointer hover:opacity-90' : ''
      } ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.dotColor} shrink-0`}
      />
      <span className="whitespace-nowrap">{config.label}</span>
    </Component>
  );
}
