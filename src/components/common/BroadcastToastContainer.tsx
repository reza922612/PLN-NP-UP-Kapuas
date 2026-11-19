import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone,
  AlertTriangle,
  Sparkles,
  X,
  Check,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { BroadcastAnnouncement, BroadcastPriority } from '../../types';
import { useBroadcasts } from '../../hooks/useBroadcasts';
import { cn } from '../../lib/utils';

const PRIORITY_STYLES: Record<
  BroadcastPriority,
  {
    label: string;
    strip: string;
    badge: string;
    iconBg: string;
    border: string;
    Icon: React.ElementType;
  }
> = {
  info: {
    label: 'Pengumuman',
    strip: 'bg-[#0072BC]',
    badge: 'bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1]',
    iconBg: 'bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1]',
    border: 'border-[#72C8F1]/50 dark:border-[#0072BC]/50',
    Icon: Megaphone,
  },
  important: {
    label: 'Penting',
    strip: 'bg-[#F9D423]',
    badge: 'bg-amber-50 dark:bg-[#F9D423]/15 text-amber-800 dark:text-[#F9D423]',
    iconBg: 'bg-amber-50 dark:bg-[#F9D423]/15 text-amber-700 dark:text-[#F9D423]',
    border: 'border-amber-300/80 dark:border-[#F9D423]/40',
    Icon: Sparkles,
  },
  urgent: {
    label: 'Mendesak',
    strip: 'bg-red-600',
    badge: 'bg-red-50 dark:bg-red-950/70 text-red-700 dark:text-red-300',
    iconBg: 'bg-red-50 dark:bg-red-950/70 text-red-600 dark:text-red-400',
    border: 'border-red-300 dark:border-red-800/80',
    Icon: AlertTriangle,
  },
};

const formatRelativeTime = (createdAt: any): string => {
  try {
    const dt = createdAt?.toDate
      ? createdAt.toDate()
      : createdAt?.seconds
      ? new Date(createdAt.seconds * 1000)
      : null;
    if (!dt) return 'Baru saja';
    return formatDistanceToNow(dt, { addSuffix: true, locale: idLocale });
  } catch {
    return 'Baru saja';
  }
};

export const BroadcastToastCard: React.FC<{
  item: BroadcastAnnouncement;
  onDismiss?: (id: string) => void;
  previewMode?: boolean;
}> = ({ item, onDismiss, previewMode = false }) => {
  const style = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.info;
  const Icon = style.Icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto relative overflow-hidden rounded-2xl bg-white/95 dark:bg-[#0E1A2E]/95 backdrop-blur-md border shadow-2xl transition-all',
        style.border
      )}
    >
      <div className={cn('absolute top-0 bottom-0 left-0 w-1.5', style.strip)} />

      <div className="p-4 pl-5 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                style.iconBg
              )}
            >
              <Icon size={17} />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider',
                    style.badge
                  )}
                >
                  {style.label}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                  <Clock size={10} />
                  {previewMode ? 'Baru saja' : formatRelativeTime(item.createdAt)}
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-extrabold text-[#173B65] dark:text-slate-100 leading-snug">
                {item.title || 'Judul Pengumuman'}
              </h4>
            </div>
          </div>

          {!previewMode && onDismiss && item.id && (
            <button
              type="button"
              onClick={() => onDismiss(item.id!)}
              aria-label="Tutup pengumuman"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line pl-12">
          {item.message || 'Isi pesan pengumuman broadcast akan tampil di sini.'}
        </p>

        <div className="flex items-center justify-between gap-3 pl-12 pt-1">
          <span className="text-[11px] font-semibold text-slate-400 truncate">
            Oleh: <span className="text-[#173B65] dark:text-slate-200">{item.senderName}</span>
          </span>

          {!previewMode && onDismiss && item.id && (
            <button
              type="button"
              onClick={() => onDismiss(item.id!)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1] hover:bg-[#0072BC] hover:text-white text-[11px] font-bold transition-colors shrink-0"
            >
              <Check size={12} />
              Mengerti
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface BroadcastToastContainerProps {
  enabled: boolean;
}

const BroadcastToastContainer: React.FC<BroadcastToastContainerProps> = ({ enabled }) => {
  const { unreadActiveBroadcasts, dismissBroadcast, dismissAllBroadcasts } = useBroadcasts({
    enabled,
    includeInactive: false,
  });

  if (!enabled || unreadActiveBroadcasts.length === 0) {
    return null;
  }

  const visibleToasts = unreadActiveBroadcasts.slice(0, 3);
  const remainingCount = unreadActiveBroadcasts.length - visibleToasts.length;

  return (
    <div
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col gap-3 w-[calc(100vw-2rem)] max-w-md pointer-events-none"
      aria-label="Pengumuman Broadcast"
    >
      {unreadActiveBroadcasts.length > 1 && (
        <div className="flex items-center justify-end pointer-events-auto">
          <button
            type="button"
            onClick={() =>
              dismissAllBroadcasts(
                unreadActiveBroadcasts.map((b) => b.id).filter(Boolean) as string[]
              )
            }
            className="px-3 py-1.5 rounded-xl bg-white/95 dark:bg-[#0E1A2E]/95 border border-slate-200 dark:border-slate-700 shadow-md text-[11px] font-bold text-[#173B65] dark:text-slate-200 hover:border-[#0072BC] transition-colors"
          >
            Tutup Semua ({unreadActiveBroadcasts.length})
          </button>
        </div>
      )}

      <AnimatePresence>
        {visibleToasts.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <BroadcastToastCard item={item} onDismiss={dismissBroadcast} />
          </motion.div>
        ))}
      </AnimatePresence>

      {remainingCount > 0 && (
        <div className="pointer-events-auto self-end px-3 py-1 rounded-lg bg-[#173B65] text-white text-[11px] font-bold shadow-md">
          +{remainingCount} pengumuman lainnya menunggu
        </div>
      )}
    </div>
  );
};

export default BroadcastToastContainer;
