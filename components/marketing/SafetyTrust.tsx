import { ShieldCheck, EyeOff, Lock, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Pillar {
  icon: LucideIcon;
  title: string;
  body: string;
}

const PILLARS: Pillar[] = [
  {
    icon: ShieldCheck,
    title: 'Input filter',
    body: 'Every prompt your child types passes through a multi-layer safety check before it ever reaches an AI model.',
  },
  {
    icon: EyeOff,
    title: 'Output filter',
    body: 'Every AI response — text, image, audio — is scanned for unsafe content. Nothing reaches your child without clearance.',
  },
  {
    icon: Lock,
    title: 'DPDPA-ready',
    body: 'Child data stays in India, parent consent is explicit, and we never sell or share anything. Built for India&apos;s DPDPA 2023.',
  },
  {
    icon: Users,
    title: 'Parent visibility',
    body: 'Weekly reports show every creation, every concept learned, and every prompt. No surprises. No black boxes.',
  },
];

export function SafetyTrust() {
  return (
    <section id="safety" className="border-y border-brand-border bg-brand-background py-20 sm:py-28">
      <div className="mx-auto max-w-screen-xl px-5 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-caption font-semibold uppercase tracking-wide text-brand-secondary">
            Safety is not a feature. It&apos;s the foundation.
          </p>
          <h2 className="mt-3 font-display text-[32px] font-extrabold leading-tight tracking-tight text-brand-text text-balance sm:text-[44px]">
            Every output, safe by default.
          </h2>
          <p className="mt-4 text-body-lg leading-relaxed text-brand-text-secondary">
            You don&apos;t have to choose between AI exposure and child safety.
            We built the safety pipeline first, then built the studios on top.
          </p>
        </div>

        {/* Pillars */}
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="relative flex flex-col rounded-2xl bg-white p-6 shadow-soft ring-1 ring-brand-border/60"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-secondary/10 text-brand-secondary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-brand-text">
                  {p.title}
                </h3>
                <p
                  className="mt-2 text-caption leading-relaxed text-brand-text-secondary"
                  dangerouslySetInnerHTML={{ __html: p.body }}
                />
              </div>
            );
          })}
        </div>

        {/* Trust badges strip */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 rounded-2xl bg-white px-6 py-5 shadow-soft ring-1 ring-brand-border/60">
          <TrustBadge label="DPDPA 2023" sub="India compliant" />
          <Separator />
          <TrustBadge label="COPPA-aligned" sub="US standard" />
          <Separator />
          <TrustBadge label="Zero ads" sub="Ever" />
          <Separator />
          <TrustBadge label="Data in India" sub="Firestore asia-south1" />
          <Separator />
          <TrustBadge label="No AI training" sub="Your kid's data stays yours" />
        </div>
      </div>
    </section>
  );
}

function TrustBadge({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-sm font-bold text-brand-text">
        {label}
      </div>
      <div className="text-[11px] text-brand-text-muted">{sub}</div>
    </div>
  );
}

function Separator() {
  return <span aria-hidden className="hidden h-8 w-px bg-brand-border sm:block" />;
}
