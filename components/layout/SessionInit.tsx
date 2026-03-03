'use client';

import { useEffect, useRef } from 'react';
import { useSession } from '@/hooks/useSession';
import { useAiPoints } from '@/contexts/AiPointsContext';

const POINTS_KEY = 'gsi-ai-points';
const CONCEPTS_KEY = 'gsi-concepts-learned';
const MIGRATED_KEY = 'gsi-points-migrated';
const SESSION_KEY = 'gsi-session-id';

/**
 * Isolates session initialization into its own component so that
 * useSession state updates (e.g. cooldown timer ticks) don't cause
 * the entire PublicLayout tree to re-render.
 *
 * Also handles one-time migration of localStorage points to Firestore.
 */
export function SessionInit() {
  useSession();
  const { syncFromServer } = useAiPoints();
  const migrationRan = useRef(false);

  useEffect(() => {
    if (migrationRan.current) return;
    migrationRan.current = true;

    const alreadyMigrated = localStorage.getItem(MIGRATED_KEY);
    if (alreadyMigrated) return;

    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) return;

    const storedPoints = parseInt(localStorage.getItem(POINTS_KEY) ?? '0', 10);
    let storedConcepts: string[] = [];
    try {
      storedConcepts = JSON.parse(localStorage.getItem(CONCEPTS_KEY) ?? '[]');
    } catch {
      // corrupted — skip
    }

    if (storedPoints <= 0 && storedConcepts.length === 0) {
      localStorage.setItem(MIGRATED_KEY, '1');
      return;
    }

    // Migrate points
    const migrate = async () => {
      try {
        const headers = {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId,
        };

        if (storedPoints > 0) {
          await fetch('/api/sessions/points', {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              action: 'add_points',
              payload: { amount: storedPoints },
            }),
          });
        }

        for (const concept of storedConcepts) {
          await fetch('/api/sessions/points', {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              action: 'learn_concept',
              payload: { concept },
            }),
          });
        }

        // Mark migration complete and clear old keys
        localStorage.setItem(MIGRATED_KEY, '1');
        localStorage.removeItem(POINTS_KEY);
        localStorage.removeItem(CONCEPTS_KEY);

        // Sync context with server after migration
        await syncFromServer();
      } catch {
        // Migration failed — will retry next load
      }
    };

    migrate();
  }, [syncFromServer]);

  return null;
}
