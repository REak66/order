import React from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cx';

const STATUS_CONFIGS = {
  ordered: {
    label: 'Ordered',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 font-semibold',
    icon: CheckCircle2,
    pulse: true,
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 font-medium',
    icon: XCircle,
    pulse: false,
  },
  not_ordered: {
    label: 'Not Ordered',
    classes: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 font-medium',
    icon: AlertCircle,
    pulse: false,
  },
};

export const StatusBadge = ({
  status = 'not_ordered',
  size = 'md', // 'sm' | 'md'
  showIcon = true,
  showDot = false,
  className = '',
  customLabel,
}) => {
  const normalized = String(status || '').toLowerCase().replace(/[-\s]/g, '_');
  const cfg = STATUS_CONFIGS[normalized] || STATUS_CONFIGS.not_ordered;
  const Icon = cfg.icon;
  const label = customLabel || cfg.label;

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[11px] gap-1'
    : 'px-2.5 py-1 text-xs gap-1.5';

  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border transition-colors select-none tracking-tight shadow-xs",
        sizeClasses,
        cfg.classes,
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            normalized === 'ordered' && "bg-emerald-500 animate-pulse",
            normalized === 'cancelled' && "bg-rose-500",
            normalized === 'not_ordered' && "bg-amber-500"
          )}
        />
      )}
      {showIcon && !showDot && <Icon size={iconSize} className="shrink-0" />}
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
