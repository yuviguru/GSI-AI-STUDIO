import Link from 'next/link';
import {
  ArrowRight,
  LayoutDashboard,
  ClipboardList,
  FileCheck2,
  Trophy,
  FlameKindling,
  GraduationCap,
  Languages,
  Wifi,
  Users2,
  Presentation,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ShippingFeature {
  icon: LucideIcon;
  title: string;
  body: string;
  status: 'live' | 'beta';
}

interface RoadmapFeature {
  icon: LucideIcon;
  title: string;
  timing: string;
  body: string;
}

const SHIPPING_TODAY: ShippingFeature[] = [
  {
    icon: LayoutDashboard,
    title: 'Teacher Dashboard',
    body: "Spot the kid who's drifting before the bell rings. One screen, every student, every subject — no chasing spreadsheets.",
    status: 'live',
  },
  {
    icon: ClipboardList,
    title: 'CBSE-aligned Lesson Plans',
    body: 'Teachers walk into the new AI period and start teaching. 24 ready-mapped lessons — zero scrambling, zero "what do I cover today?"',
    status: 'live',
  },
  {
    icon: FileCheck2,
    title: 'Compliance Reports',
    body: "The inspector arrives, you click once, they leave happy. The midnight-before-audit panic is over.",
    status: 'live',
  },
  {
    icon: Trophy,
    title: 'Inter-school Competitions',
    body: "Your school's name on a national leaderboard. Kids who used to skip class beg to make the team.",
    status: 'live',
  },
  {
    icon: FlameKindling,
    title: 'Curriculum Heatmap',
    body: 'See the gaps before the inspector does — and patch them before they become a problem in front of the board.',
    status: 'live',
  },
  {
    icon: GraduationCap,
    title: 'Teacher Activity Reports',
    body: "Know which teachers are sparking kids — and which ones need backup — every Monday morning, without hunting.",
    status: 'live',
  },
];

const ROADMAP: RoadmapFeature[] = [
  {
    icon: Wifi,
    title: 'Offline Mode (PWA)',
    timing: 'Q1 2026',
    body: 'Works without internet during the school day — syncs when Wi-Fi is back. Built for schools with patchy connectivity.',
  },
  {
    icon: Languages,
    title: 'Tamil, Telugu, Hindi, Kannada',
    timing: 'Q2 2026',
    body: 'Creation interfaces in four Indian languages. Students create in their mother tongue, AI X-Ray lessons follow.',
  },
  {
    icon: Presentation,
    title: 'Teacher training + certification',
    timing: 'Q2 2026',
    body: 'Async modules that qualify teachers to deliver the CBSE AI curriculum — with a certificate at the end.',
  },
  {
    icon: Users2,
    title: 'Parent-Teacher Sync',
    timing: 'Q3 2026',
    body: 'Share progress reports seamlessly between the school dashboard and the parent dashboard. One child, one story.',
  },
];

export function ForSchoolsDetail() {
  return (
    <section id="schools" className="relative overflow-hidden bg-gradient-to-b from-brand-background to-white py-20 sm:py-28">
      <div className="relative mx-auto max-w-screen-xl px-5 sm:px-6">
        {/* Header */}
        <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-caption font-semibold uppercase tracking-wide text-brand-accent">
              For schools
            </p>
            <h2 className="mt-3 font-display text-[32px] font-extrabold leading-tight tracking-tight text-brand-text text-balance sm:text-[44px]">
              Hit the 2026-27 AI mandate without panicking your staff.
            </h2>
            <p className="mt-4 text-body-lg leading-relaxed text-brand-text-secondary">
              The studios your students will love — plus every dashboard,
              lesson plan and compliance report your principal will need on
              audit day. Already running in schools across India.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/school"
              className="inline-flex items-center gap-2 rounded-full bg-brand-accent px-6 py-3 text-body font-semibold text-white shadow-button transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Book a school pilot
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/teacher"
              className="text-body font-semibold text-brand-text-secondary transition-colors hover:text-brand-text"
            >
              Teacher sign in →
            </Link>
          </div>
        </div>

        {/* Shipping today */}
        <div className="mt-16">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2 w-2 rounded-full bg-brand-secondary ring-4 ring-brand-secondary/20" />
            <h3 className="font-display text-lg font-bold uppercase tracking-wide text-brand-text">
              Shipping today
            </h3>
            <span className="text-caption text-brand-text-muted">
              · 6 capabilities in production
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SHIPPING_TODAY.map((f) => {
              const Icon = f.icon;
              return (
                <article
                  key={f.title}
                  className="relative flex flex-col rounded-2xl bg-white p-6 shadow-soft ring-1 ring-brand-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-brand-secondary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-secondary">
                      Live
                    </span>
                  </div>
                  <h4 className="mt-5 font-display text-base font-bold text-brand-text">
                    {f.title}
                  </h4>
                  <p className="mt-1.5 text-caption leading-relaxed text-brand-text-secondary">
                    {f.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        {/* Roadmap */}
        <div className="mt-16">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2 w-2 rounded-full bg-brand-primary ring-4 ring-brand-primary/20" />
            <h3 className="font-display text-lg font-bold uppercase tracking-wide text-brand-text">
              On the roadmap
            </h3>
            <span className="text-caption text-brand-text-muted">
              · 4 launches through 2026
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {ROADMAP.map((f) => {
              const Icon = f.icon;
              return (
                <article
                  key={f.title}
                  className="relative flex flex-col rounded-2xl bg-white p-6 shadow-soft ring-1 ring-brand-primary/15"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-ai text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-primary">
                      {f.timing}
                    </span>
                  </div>
                  <h4 className="mt-5 font-display text-base font-bold text-brand-text">
                    {f.title}
                  </h4>
                  <p className="mt-1.5 text-caption leading-relaxed text-brand-text-secondary">
                    {f.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        {/* Pilot CTA strip */}
        <div className="mt-16 rounded-3xl bg-white p-6 shadow-card ring-1 ring-brand-accent/20 sm:p-8">
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h3 className="font-display text-xl font-extrabold text-brand-text sm:text-2xl">
                Be the school parents brag about — by next term.
              </h3>
              <p className="mt-2 text-caption leading-relaxed text-brand-text-secondary">
                You'll be live in 2 weeks. We handle the teacher training, slot
                the lessons into your existing timetable, and have the audit
                report ready before the inspector knocks. From ₹99 per student
                per month · 50-student minimum.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/school"
                className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-body font-semibold text-white shadow-button transition-all hover:brightness-110 active:scale-[0.98]"
              >
                Book a pilot
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="mailto:schools@gsi.ai"
                className="inline-flex items-center gap-2 rounded-full border-2 border-brand-border bg-white px-6 py-3 text-body font-semibold text-brand-text transition-all hover:border-brand-primary"
              >
                Email schools team
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
