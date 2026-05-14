import fs from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { ArrowLeft, BookOpen, Users, GraduationCap, Building2 } from 'lucide-react';
import './help.css';

export const metadata: Metadata = {
  title: 'How GSI AI Studio works · Product walkthrough',
  description:
    'A guided tour through every feature in GSI AI Studio — for kids, parents, teachers and schools. Aligned to CBSE AI & Computational-Thinking curriculum.',
};

// Statically render at build time. The doc file is part of the repo so changes
// land with each deploy.
export const dynamic = 'force-static';

const ROLE_QUICKLINKS = [
  {
    id: 'the-kid-experience',
    title: 'For Kids',
    description: '6 creation studios, gamified learning, AI literacy by doing.',
    icon: BookOpen,
    accent: 'from-violet-500 to-fuchsia-500',
    cta: 'Jump in →',
    href: '/',
  },
  {
    id: 'the-parent-experience',
    title: 'For Parents',
    description: 'Data rights cockpit, message inbox, class feed.',
    icon: Users,
    accent: 'from-cyan-500 to-emerald-500',
    cta: 'Open parent dashboard →',
    href: '/parent/settings/data-rights',
  },
  {
    id: 'the-teacher-experience',
    title: 'For Teachers',
    description: 'NCERT lesson plans, question papers, AI feedback, PTM notes.',
    icon: GraduationCap,
    accent: 'from-orange-500 to-rose-500',
    cta: 'Open teacher dashboard →',
    href: '/teacher',
  },
  {
    id: 'the-school-admin-experience',
    title: 'For Schools',
    description: 'Analytics, compliance, branding, integrations, parent digests.',
    icon: Building2,
    accent: 'from-blue-500 to-violet-500',
    cta: 'Open school dashboard →',
    href: '/school',
  },
] as const;

async function loadWalkthrough(): Promise<string> {
  // The walkthrough lives at the workspace root (../../docs/...) but
  // process.cwd() during build runs from apps/kid/. Try both locations
  // so the page works in dev (where cwd is the repo root) and in build
  // (where cwd is the app root).
  const candidates = [
    path.join(process.cwd(), '..', '..', 'docs', 'test-journeys.md'),
    path.join(process.cwd(), 'docs', 'test-journeys.md'),
  ];
  let raw = '';
  for (const candidate of candidates) {
    try {
      raw = await fs.readFile(candidate, 'utf-8');
      break;
    } catch {
      // try next
    }
  }
  if (!raw) {
    throw new Error('test-journeys.md not found — checked: ' + candidates.join(', '));
  }

  // Strip the engineer-facing appendix; everything before it is product copy.
  const appendixMarker = '## Appendix · How to test this yourself';
  const productOnly = raw.includes(appendixMarker)
    ? raw.slice(0, raw.indexOf(appendixMarker))
    : raw;

  marked.setOptions({ gfm: true, breaks: false });
  return marked.parse(productOnly) as string;
}

export default async function HelpPage() {
  const html = await loadWalkthrough();

  return (
    <div className="min-h-screen bg-brand-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-brand-border bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/images/gsi-logo.svg"
              alt="GSI AI Studio"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
            <span className="font-display text-sm font-bold text-brand-text sm:text-base">
              GSI <span className="text-brand-primary">AI Studio</span>
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-primary/90 sm:px-4 sm:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to the app
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-brand-border bg-gradient-to-br from-violet-50 via-white to-cyan-50">
        <div className="mx-auto max-w-screen-xl px-5 py-12 sm:px-6 sm:py-16">
          <p className="font-display text-xs font-bold uppercase tracking-wider text-brand-primary">
            Product walkthrough
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight text-brand-text sm:text-4xl lg:text-5xl">
            How GSI AI Studio works
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-text-secondary sm:text-lg">
            A guided tour through every feature — for kids creating with AI,
            parents managing privacy, teachers planning lessons, and schools
            running the platform. Read top-to-bottom or jump to your role.
          </p>

          {/* Role cards */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLE_QUICKLINKS.map((r) => {
              const Icon = r.icon;
              return (
                <a
                  key={r.id}
                  href={`#${r.id}`}
                  className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${r.accent} p-5 text-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated`}
                >
                  <Icon className="h-7 w-7 drop-shadow-md" />
                  <h2 className="mt-3 font-display text-lg font-bold">{r.title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/90">
                    {r.description}
                  </p>
                  <p className="mt-3 inline-flex items-center text-xs font-bold text-white/95">
                    Read the section ↓
                  </p>
                  <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                </a>
              );
            })}
          </div>

          {/* In-app CTAs */}
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="text-xs font-medium text-brand-text-secondary">
              Or open a dashboard directly:
            </span>
            {ROLE_QUICKLINKS.map((r) => (
              <Link
                key={r.id}
                href={r.href}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-text shadow-soft transition hover:shadow-card"
              >
                {r.cta}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Body — rendered markdown */}
      <main className="mx-auto max-w-screen-md px-5 py-12 sm:px-6">
        <article
          className="help-article"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Footer CTA */}
        <div className="mt-16 rounded-3xl bg-gradient-to-br from-brand-primary to-brand-ai p-8 text-center text-white shadow-card">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Ready to try it?
          </h2>
          <p className="mt-2 text-sm text-white/90 sm:text-base">
            Open the kid dashboard and create your first story in under a minute.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-brand-primary transition hover:bg-white/95"
            >
              Open the app
            </Link>
            <Link
              href="/teacher/login"
              className="rounded-full bg-white/15 px-5 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
            >
              Teacher sign-in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
