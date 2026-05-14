'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { NotificationDoc } from '@gsi/types';

interface ApiNotification {
  id: string;
  type: string;
  payload: { title: string; body: string; href?: string };
  readAt: string | null;
  createdAt: string;
}

function timeAgo(date: Date): string {
  const s = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function NotificationBell() {
  const { isAuthenticated, getIdToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDoc[]>([]);
  const [unread, setUnread] = useState(0);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch('/api/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const json = await res.json();
    const raw = (json.data?.notifications ?? []) as ApiNotification[];
    setItems(
      raw.map((n) => ({
        id: n.id,
        recipientUid: '',
        type: n.type as NotificationDoc['type'],
        payload: n.payload,
        channels: ['in_app'],
        readAt: n.readAt ? new Date(n.readAt) : null,
        createdAt: new Date(n.createdAt),
      })),
    );
    setUnread(json.data?.unreadCount ?? 0);
  }, [isAuthenticated, getIdToken]);

  useEffect(() => {
    void load();
    if (!isAuthenticated) return;
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, [isAuthenticated, load]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('click', onClickOutside);
    return () => window.removeEventListener('click', onClickOutside);
  }, [open]);

  async function markRead(id: string) {
    const token = await getIdToken();
    if (!token) return;
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)),
    );
    setUnread((n) => Math.max(0, n - 1));
  }

  async function markAll() {
    const token = await getIdToken();
    if (!token) return;
    await fetch('/api/notifications/mark-all-read', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
    setUnread(0);
  }

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex items-center justify-center rounded-full p-2 text-gray-600 hover:bg-gray-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span
            aria-label={`${unread} unread`}
            className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-gray-500">
                You&apos;re all caught up.
              </p>
            ) : (
              items.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onClick={() => {
                    if (!n.readAt) void markRead(n.id);
                    setOpen(false);
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onClick,
}: {
  notification: NotificationDoc;
  onClick: () => void;
}) {
  const body = (
    <div className="flex items-start gap-3 px-4 py-3">
      <span
        className={cn(
          'mt-1 h-2 w-2 shrink-0 rounded-full',
          notification.readAt ? 'bg-transparent' : 'bg-indigo-500',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {notification.payload.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">
          {notification.payload.body}
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">
          {timeAgo(notification.createdAt)}
        </p>
      </div>
    </div>
  );

  if (notification.payload.href) {
    return (
      <Link
        href={notification.payload.href}
        onClick={onClick}
        className="block hover:bg-gray-50"
      >
        {body}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left hover:bg-gray-50"
    >
      {body}
    </button>
  );
}
