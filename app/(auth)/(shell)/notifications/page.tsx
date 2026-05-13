'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, Inbox, Loader2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import type { NotificationDoc } from '@gsi/types';

const FILTERS = ['All', 'Unread'] as const;
type Filter = (typeof FILTERS)[number];

const TYPE_LABELS: Record<NotificationDoc['type'], string> = {
  assignment_new: 'New assignment',
  assignment_due_soon: 'Due soon',
  submission_reviewed: 'Reviewed',
  badge_earned: 'Badge earned',
  teacher_feedback: 'Feedback',
  sub_assigned: 'Substitute assigned',
};

function timeAgo(date: Date): string {
  const s = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsInboxPage() {
  const { items, unreadCount, loading, error, markRead, markAllRead, refresh } =
    useNotifications({ pollMs: 30_000, limit: 50 });
  const [filter, setFilter] = useState<Filter>('All');

  const visible = useMemo(
    () => (filter === 'Unread' ? items.filter((n) => !n.readAt) : items),
    [items, filter],
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-text sm:text-3xl">
            Notifications
          </h1>
          <p className="text-sm text-brand-text-secondary">
            Assignments, feedback, badges, and school alerts.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-primary transition hover:bg-brand-primary/15"
          >
            <Check className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </header>

      <div className="flex items-center justify-between border-b border-gray-100">
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'relative px-4 py-2 text-sm font-semibold transition-colors',
                filter === f
                  ? 'text-brand-primary'
                  : 'text-brand-text-secondary hover:text-brand-text',
              )}
            >
              {f}
              {f === 'Unread' && unreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
              {filter === f && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-primary" />
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={refresh}
          className="text-xs font-semibold text-brand-text-secondary hover:text-brand-text"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl bg-white p-10 text-brand-text-secondary shadow-card">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-10 text-center text-brand-text-secondary shadow-card">
          <Inbox className="h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium">
            {filter === 'Unread' ? "You're all caught up." : 'No notifications yet.'}
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl bg-white shadow-card">
          {visible.map((n, idx) => (
            <li
              key={n.id}
              className={cn(idx > 0 && 'border-t border-gray-100')}
            >
              <NotificationRow notification={n} onMarkRead={() => markRead(n.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: NotificationDoc;
  onMarkRead: () => void;
}) {
  const unread = !notification.readAt;
  const inner = (
    <div className="flex items-start gap-3 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
        <Bell className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-semibold text-brand-text">
            {notification.payload.title}
          </p>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">
            {TYPE_LABELS[notification.type]}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-brand-text-secondary">
          {notification.payload.body}
        </p>
        <p className="mt-1 text-[11px] text-brand-text-muted">
          {timeAgo(notification.createdAt)}
        </p>
      </div>
      {unread && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-primary" aria-label="Unread" />
      )}
    </div>
  );

  if (notification.payload.href) {
    return (
      <Link
        href={notification.payload.href}
        onClick={() => unread && onMarkRead()}
        className="block transition hover:bg-gray-50"
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => unread && onMarkRead()}
      className="block w-full text-left transition hover:bg-gray-50"
    >
      {inner}
    </button>
  );
}
