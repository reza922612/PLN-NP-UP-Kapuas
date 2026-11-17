import React from 'react';
import { LucideIcon, AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  badge?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  actions,
  badge,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="flex items-start sm:items-center gap-3.5">
      {Icon && (
        <div className="w-11 h-11 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 border border-[#72C8F1]/40 dark:border-[#72C8F1]/25 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center shrink-0">
          <Icon size={21} />
        </div>
      )}
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-lg sm:text-xl font-extrabold text-[#173B65] dark:text-slate-100 tracking-tight">
            {title}
          </h2>
          {badge && (
            <span className="px-2 py-0.5 rounded-md bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1] text-[10px] font-bold uppercase tracking-wider">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
  </div>
);

export type MetricAccent = 'blue' | 'cyan' | 'yellow' | 'navy' | 'emerald' | 'amber' | 'red';

interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  unit?: string;
  subtitle?: string;
  icon?: LucideIcon;
  accent?: MetricAccent;
  trend?: string;
  onClick?: () => void;
}

const ACCENT_STYLES: Record<MetricAccent, { iconBg: string; iconText: string; bar: string }> = {
  blue: {
    iconBg: 'bg-[#EAF6FC] dark:bg-[#0072BC]/20',
    iconText: 'text-[#0072BC] dark:text-[#72C8F1]',
    bar: 'bg-[#0072BC]',
  },
  cyan: {
    iconBg: 'bg-[#EAF6FC] dark:bg-[#72C8F1]/15',
    iconText: 'text-[#0072BC] dark:text-[#72C8F1]',
    bar: 'bg-[#72C8F1]',
  },
  yellow: {
    iconBg: 'bg-amber-50 dark:bg-[#F9D423]/15',
    iconText: 'text-amber-700 dark:text-[#F9D423]',
    bar: 'bg-[#F9D423]',
  },
  navy: {
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconText: 'text-[#173B65] dark:text-slate-200',
    bar: 'bg-[#173B65]',
  },
  emerald: {
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
  },
  amber: {
    iconBg: 'bg-amber-50 dark:bg-amber-950/50',
    iconText: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
  },
  red: {
    iconBg: 'bg-red-50 dark:bg-red-950/50',
    iconText: 'text-red-600 dark:text-red-400',
    bar: 'bg-red-500',
  },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  accent = 'blue',
  trend,
  onClick,
}) => {
  const styles = ACCENT_STYLES[accent];
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.16 }}
      onClick={onClick}
      className={cn(
        'corporate-card p-5 relative overflow-hidden group',
        onClick && 'cursor-pointer hover:border-[#0072BC]/40 dark:hover:border-[#72C8F1]/40'
      )}
    >
      <div className={cn('absolute top-0 inset-x-0 h-1 opacity-90', styles.bar)} />
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
            {title}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-[26px] font-extrabold text-[#173B65] dark:text-white tabular-nums tracking-tight leading-none">
              {value}
            </span>
            {unit && (
              <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500">
                {unit}
              </span>
            )}
          </div>
          {(subtitle || trend) && (
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate pt-0.5">
              {trend && (
                <span className="font-bold text-[#0072BC] dark:text-[#72C8F1] mr-1.5">
                  {trend}
                </span>
              )}
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
              styles.iconBg,
              styles.iconText
            )}
          >
            <Icon size={19} />
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
}) => (
  <div className={cn('corporate-card overflow-hidden', className)}>
    {(title || action) && (
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-[#F8FBFD] dark:bg-[#11223B]/60">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <Icon size={17} className="text-[#0072BC] dark:text-[#72C8F1] shrink-0" />
          )}
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-bold text-[#173B65] dark:text-slate-100 tracking-tight truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )}
    <div className={cn('p-6', bodyClassName)}>{children}</div>
  </div>
);

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
}) => (
  <div className="py-16 px-6 text-center space-y-4">
    <div className="w-14 h-14 rounded-2xl bg-[#EAF6FC] dark:bg-[#0072BC]/15 border border-[#72C8F1]/40 dark:border-[#72C8F1]/20 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center mx-auto">
      <Icon size={26} />
    </div>
    <div className="space-y-1 max-w-md mx-auto">
      <h4 className="text-sm font-bold text-[#173B65] dark:text-slate-100">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
    {action && <div className="pt-1">{action}</div>}
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 6,
  cols = 5,
}) => (
  <div className="p-6 space-y-3 animate-pulse">
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="h-3 rounded bg-slate-200 dark:bg-slate-800" />
      ))}
    </div>
    <div className="space-y-3 pt-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="h-11 rounded-xl bg-slate-100/90 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
        />
      ))}
    </div>
  </div>
);

export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="corporate-card p-6 space-y-4 h-48"
      >
        <div className="flex justify-between">
          <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="w-20 h-5 rounded-md bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800/70" />
        </div>
        <div className="h-8 w-full rounded-lg bg-slate-100 dark:bg-slate-800/60" />
      </div>
    ))}
  </div>
);

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Ya, Hapus',
  cancelLabel = 'Batal',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-[#071120]/65 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-[#0E1A2E] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 space-y-5"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-[#173B65] dark:text-slate-100">
              {title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
