'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const LINKS = [
  { label: 'Studios', href: '#studios' },
  { label: 'Flagship', href: '#flagship' },
  { label: 'For schools', href: '#schools' },
  { label: 'How AI works', href: '#x-ray' },
  { label: 'Pricing', href: '#pricing' },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-border/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-5 sm:px-6">
        {/* Logo */}
        <Link href="/welcome" className="flex items-center gap-2 whitespace-nowrap">
          <Image
            src="/images/gsi-logo.svg"
            alt="GSI AI Studio"
            width={36}
            height={36}
            className="h-9 w-9"
          />
          <span className="font-display text-lg font-bold text-brand-text">
            GSI <span className="text-brand-primary">AI Studio</span>
          </span>
        </Link>

        {/* Desktop nav — only from lg+, before that the hamburger handles it */}
        <nav className="hidden items-center gap-7 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-body font-medium text-brand-text-secondary transition-colors hover:text-brand-text"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* CTAs */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/"
            className="text-body font-medium text-brand-text-secondary hover:text-brand-text"
          >
            Sign in
          </Link>
          <Link
            href="/create/story"
            className="rounded-full bg-brand-primary px-5 py-2 text-body font-semibold text-white shadow-button transition-all hover:brightness-110 hover:shadow-button-hover active:scale-[0.98]"
          >
            Start creating
          </Link>
        </div>

        {/* Mobile toggle — everything below lg */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-brand-text lg:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-brand-border bg-white lg:hidden">
          <nav className="flex flex-col px-5 py-4">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2.5 text-body font-medium text-brand-text"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-brand-border pt-4">
              <Link
                href="/"
                className="rounded-lg border border-brand-border px-4 py-2.5 text-center text-body font-semibold text-brand-text"
              >
                Sign in
              </Link>
              <Link
                href="/create/story"
                className="rounded-lg bg-brand-primary px-4 py-2.5 text-center text-body font-semibold text-white"
              >
                Start creating
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
