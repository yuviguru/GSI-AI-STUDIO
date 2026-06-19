'use client';

/**
 * useBookFit (BOOK-009) — size a book spread to fit the screen.
 *
 * We never want to show a book at its real print dimensions on screen (a Tall
 * 216×279mm page is taller than most phones). Instead we scale the spread to
 * "contain" inside the available space — bounded by BOTH the container width
 * and the remaining viewport height — so the whole page is always visible
 * without scrolling, on desktop and mobile alike. The real trim size is only
 * used by the PDF generator (print), never on screen.
 *
 * Usage:
 *   const { containerRef, width, height, ready } = useBookFit(aspect);
 *   <div ref={containerRef} className="flex justify-center">
 *     <div style={ready ? { width, height } : { width: '100%', aspectRatio: aspect }}>
 *       …spread…
 *     </div>
 *   </div>
 *
 * `aspect` is width/height of ONE spread (use bookAspect for a single page,
 * bookAspect*2 for a two-page spread). `reserveBelow` is the vertical space to
 * leave for chrome under the book (nav, hints). `fromViewportTop` ignores the
 * container's own top offset and fits against the whole viewport height minus
 * `reserveBelow` — use it inside a vertically-centred modal (the reader),
 * where the container is centred rather than top-anchored.
 */

import { useLayoutEffect, useRef, useState } from 'react';

interface UseBookFitOptions {
  /** Px to leave below the book for nav / hints. */
  reserveBelow?: number;
  /** Never shrink the book below this height (px). */
  minHeight?: number;
  /** Fit against the full viewport height (minus reserveBelow) instead of the
   *  container's measured top. For centred modals. */
  fromViewportTop?: boolean;
}

interface BookFit {
  containerRef: React.RefObject<HTMLDivElement>;
  width: number;
  height: number;
  ready: boolean;
}

export function useBookFit(aspect: number, options: UseBookFitOptions = {}): BookFit {
  const { reserveBelow = 150, minHeight = 200, fromViewportTop = false } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0, ready: false });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !Number.isFinite(aspect) || aspect <= 0) return;

    let raf = 0;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const availW = el.clientWidth || rect.width;
      // `rect.top` is viewport-relative, so it goes negative as the page
      // scrolls — and `vh - rect.top` would then balloon, growing the book,
      // which causes MORE scroll: a runaway loop. Adding scrollY gives the
      // element's offset from the top of the DOCUMENT, which is stable no
      // matter how far we've scrolled, so the fit converges.
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const offsetTop = fromViewportTop ? 0 : rect.top + scrollY;
      const availH = Math.max(minHeight, vh - offsetTop - reserveBelow);
      // "Contain" fit: start at full available height, fall back to width-bound.
      let h = availH;
      let w = h * aspect;
      if (w > availW) {
        w = availW;
        h = w / aspect;
      }
      setBox((prev) => {
        const width = Math.round(w);
        const height = Math.round(h);
        if (prev.ready && prev.width === width && prev.height === height) return prev;
        return { width, height, ready: true };
      });
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
    };
  }, [aspect, reserveBelow, minHeight, fromViewportTop]);

  return { containerRef, width: box.width, height: box.height, ready: box.ready };
}
