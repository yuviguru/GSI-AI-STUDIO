'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export type KokoExpression =
  | 'waving'
  | 'happy'
  | 'thinking'
  | 'celebrating'
  | 'surprised'
  | 'painting'
  | 'singing';

interface KokoLottieProps {
  expression?: KokoExpression;
  size?: number;
  loop?: boolean;
  className?: string;
}

// Emoji fallback for first paint + SSR
const FALLBACK_EMOJI: Record<KokoExpression, string> = {
  waving: '👋',
  happy: '😸',
  thinking: '🤔',
  celebrating: '🎉',
  surprised: '😮',
  painting: '🎨',
  singing: '🎵',
};

export function KokoLottie({
  expression = 'waving',
  size = 180,
  loop = true,
  className = '',
}: KokoLottieProps) {
  const [animationData, setAnimationData] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/lottie/koko-${expression}.json`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setAnimationData(data);
      })
      .catch(() => {
        // silently fall back to emoji
      });
    return () => {
      cancelled = true;
    };
  }, [expression]);

  if (!animationData) {
    return (
      <div
        aria-hidden
        className={`flex items-center justify-center ${className}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.6) }}
      >
        {FALLBACK_EMOJI[expression]}
      </div>
    );
  }

  return (
    <div className={className} style={{ width: size, height: size }}>
      <Lottie
        animationData={animationData}
        loop={loop}
        autoplay
        aria-hidden
      />
    </div>
  );
}
