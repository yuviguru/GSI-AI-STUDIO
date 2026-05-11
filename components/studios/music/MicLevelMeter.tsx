'use client';

/**
 * MicLevelMeter — visual mic test (PERF-001).
 *
 * Renders animated amplitude bars driven by useMicLevel and a status
 * line that flips as we detect voice or sustained silence. Used by the
 * SingAlongRecorder's "Test mic" step so kids can verify the mic is
 * picking up sound BEFORE they commit to a take.
 *
 * Auto-starts on mount (the parent should only render this in a
 * permission-friendly context — i.e. directly after the kid taps a
 * "Test mic" button).
 */

import { useEffect } from 'react';
import { Mic, MicOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMicLevel } from '@/hooks/useMicLevel';

export interface MicLevelMeterProps {
  /** Called when "Done" is tapped — parent dismisses the test. */
  onDone?: () => void;
  /**
   * Called when the kid taps a primary action that means "I'm satisfied,
   * start the recording now". If omitted, only "Done" is shown.
   */
  onContinue?: () => void;
  /** Continue button label. Default "Record now". */
  continueLabel?: string;
}

const BAR_COUNT = 24;

export function MicLevelMeter({
  onDone,
  onContinue,
  continueLabel = 'Record now',
}: MicLevelMeterProps) {
  const meter = useMicLevel();

  useEffect(() => {
    void meter.start();
    return () => meter.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = (() => {
    if (meter.state === 'requesting' || meter.state === 'idle') {
      return {
        kind: 'loading' as const,
        text: 'Getting your mic ready...',
      };
    }
    if (meter.state === 'error') {
      return {
        kind: 'error' as const,
        text: meter.error ?? "Couldn't access your mic.",
      };
    }
    if (meter.voiceDetected) {
      return {
        kind: 'good' as const,
        text: 'Sounds great! Your mic is working.',
      };
    }
    if (meter.silenceTooLong) {
      return {
        kind: 'silent' as const,
        text:
          "Hmm, we don't hear anything. Make sure your mic isn't muted or unplugged.",
      };
    }
    return {
      kind: 'neutral' as const,
      text: 'Say something to test your mic!',
    };
  })();

  return (
    <div className="rounded-2xl border-2 border-brand-purple/30 bg-white p-4">
      {/* Bars */}
      <div className="mb-3 flex h-20 items-center justify-center gap-1 px-2">
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const offset = Math.abs((i - BAR_COUNT / 2) / (BAR_COUNT / 2));
          const height = Math.max(
            4,
            meter.liveAmplitude * 64 * (1 - offset * 0.5),
          );
          const barColor =
            status.kind === 'good'
              ? 'bg-green-500'
              : status.kind === 'silent' || status.kind === 'error'
                ? 'bg-gray-300'
                : 'bg-brand-orange';
          return (
            <span
              key={i}
              className={cn(
                'block w-1.5 rounded-full transition-[height] duration-75',
                barColor,
              )}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>

      {/* Status line */}
      <div
        className={cn(
          'mb-3 flex items-center justify-center gap-2 text-sm font-semibold',
          status.kind === 'good' && 'text-green-600',
          status.kind === 'silent' && 'text-amber-600',
          status.kind === 'error' && 'text-red-600',
          (status.kind === 'neutral' || status.kind === 'loading') &&
            'text-gray-700',
        )}
      >
        {status.kind === 'good' && <CheckCircle2 className="h-4 w-4" />}
        {status.kind === 'silent' && <MicOff className="h-4 w-4" />}
        {status.kind === 'error' && <AlertCircle className="h-4 w-4" />}
        {status.kind === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status.kind === 'neutral' && <Mic className="h-4 w-4" />}
        <span>{status.text}</span>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="flex-1 rounded-xl border-2 border-gray-200 bg-white py-2 text-sm font-bold text-gray-700 transition-all active:scale-95"
          >
            Done
          </button>
        )}
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className={cn(
              'rounded-xl py-2 text-sm font-bold text-white transition-all active:scale-95',
              onDone ? 'flex-[2]' : 'flex-1',
              status.kind === 'good'
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-brand-orange hover:bg-brand-orange/90',
            )}
          >
            {continueLabel}
          </button>
        )}
      </div>
    </div>
  );
}
