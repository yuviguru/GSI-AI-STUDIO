'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { generateSessionId } from '@/lib/utils';
import type { SessionResponse } from '@/types';

const SESSION_KEY = 'gsi-session-id';
const MAX_CREATIONS_PER_DAY = 5;

interface SessionState {
  sessionId: string;
  creationsRemaining: number;
  cooldownSeconds: number;
  expiresAt: string | null;
  isReady: boolean;
  error: string | null;
}

export function useSession() {
  const [session, setSession] = useState<SessionState>({
    sessionId: '',
    creationsRemaining: MAX_CREATIONS_PER_DAY,
    cooldownSeconds: 0,
    expiresAt: null,
    isReady: false,
    error: null,
  });

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start cooldown countdown timer
  const startCooldown = useCallback((seconds: number) => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    if (seconds <= 0) return;

    setSession((prev) => ({ ...prev, cooldownSeconds: seconds }));
    cooldownRef.current = setInterval(() => {
      setSession((prev) => {
        const next = prev.cooldownSeconds - 1;
        if (next <= 0) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return { ...prev, cooldownSeconds: 0 };
        }
        return { ...prev, cooldownSeconds: next };
      });
    }, 1000);
  }, []);

  // Sync session with server
  const syncSession = useCallback(
    async (sessionId: string) => {
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const json: { success: boolean; data: SessionResponse; error?: { code: string; message: string } } =
          await res.json();

        if (json.success && json.data) {
          setSession((prev) => ({
            ...prev,
            creationsRemaining: json.data.creationsRemaining,
            expiresAt: json.data.expiresAt,
            error: null,
          }));
          if (json.data.cooldownSeconds > 0) {
            startCooldown(json.data.cooldownSeconds);
          }
        }
      } catch {
        // Server unavailable — use local defaults, non-blocking
      }
    },
    [startCooldown]
  );

  // Initialize or restore session on mount
  useEffect(() => {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = generateSessionId();
      localStorage.setItem(SESSION_KEY, id);
    }
    setSession((prev) => ({ ...prev, sessionId: id!, isReady: true }));
    syncSession(id);
  }, [syncSession]);

  // Cleanup cooldown timer
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // Called after a successful creation to update limits
  const trackCreation = useCallback(async () => {
    await syncSession(session.sessionId);
  }, [session.sessionId, syncSession]);

  const canCreate = session.isReady && session.creationsRemaining > 0 && session.cooldownSeconds === 0;

  return { ...session, canCreate, trackCreation };
}
