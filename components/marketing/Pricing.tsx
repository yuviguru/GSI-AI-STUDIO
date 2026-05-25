import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { PLANS, type Plan } from '@/lib/billing/plans';

interface Tier {
  name: string;
  tagline: string;
  price: string;
  priceUnit?: string;
  priceNote: string;
  features: string[];
  cta: { label: string; href: string };
  featured?: boolean;
}

/**
 * Marketing tiers are derived from the billing config in `lib/billing/plans.ts`.
 * To change pricing, features, or marketing copy, edit `PLANS` there — this
 * component re-renders from the single source of truth. The `admin` plan is
 * filtered out (internal-only, not customer-facing).
 *
 * Price formatting: free shows "₹0", custom-priced plans (school) show
 * "Custom", everything else shows "₹<inr>".
 */
function formatPrice(plan: Plan): string {
  if (plan.price.inr === null) return 'Custom';
  if (plan.price.inr === 0) return '₹0';
  return `₹${plan.price.inr}`;
}

function planToTier(plan: Plan): Tier {
  return {
    name: plan.displayName,
    tagline: plan.marketing.tagline,
    price: formatPrice(plan),
    priceUnit: plan.price.period || undefined,
    priceNote: plan.price.subline ?? '',
    features: plan.marketing.features,
    cta: plan.marketing.cta,
    featured: plan.marketing.featured,
  };
}

const TIERS: Tier[] = Object.values(PLANS)
  .filter((p) => p.id !== 'admin')
  .map(planToTier);

export function Pricing() {
  return (
    <section id="pricing" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-screen-xl px-5 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-caption font-semibold uppercase tracking-wide text-brand-primary">
            Simple pricing. No surprises.
          </p>
          <h2 className="mt-3 font-display text-[32px] font-extrabold leading-tight tracking-tight text-brand-text text-balance sm:text-[44px]">
            Free forever. Pro when you&apos;re ready.
          </h2>
          <p className="mt-4 text-body-lg leading-relaxed text-brand-text-secondary">
            Real numbers, visible upfront. Start free — most families never need
            anything else.
          </p>
        </div>

        {/* Tiers */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <PricingCard key={tier.name} tier={tier} />
          ))}
        </div>

        {/* Fine print */}
        <p className="mt-8 text-center text-caption text-brand-text-muted">
          All prices in INR. GST included. Pause or cancel from your dashboard at any time.
        </p>
      </div>
    </section>
  );
}

function PricingCard({ tier }: { tier: Tier }) {
  const featured = tier.featured;
  return (
    <article
      className={`relative flex flex-col rounded-3xl p-7 sm:p-8 ${
        featured
          ? 'bg-gradient-to-br from-brand-primary to-brand-ai text-white shadow-elevated ring-1 ring-brand-primary/30'
          : 'bg-white text-brand-text shadow-card ring-1 ring-brand-border/60'
      }`}
    >
      {/* Featured ribbon */}
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-button">
          Most popular
        </div>
      )}

      {/* Name + tagline */}
      <div>
        <h3
          className={`font-display text-2xl font-extrabold ${
            featured ? 'text-white' : 'text-brand-text'
          }`}
        >
          {tier.name}
        </h3>
        <p
          className={`mt-1.5 text-caption ${
            featured ? 'text-white/80' : 'text-brand-text-secondary'
          }`}
        >
          {tier.tagline}
        </p>
      </div>

      {/* Price */}
      <div className="mt-6">
        <div className="flex items-baseline gap-1.5">
          <span
            className={`numeric font-display text-4xl font-extrabold sm:text-5xl ${
              featured ? 'text-white' : 'text-brand-text'
            }`}
          >
            {tier.price}
          </span>
          {tier.priceUnit && (
            <span
              className={`text-body font-semibold ${
                featured ? 'text-white/80' : 'text-brand-text-secondary'
              }`}
            >
              {tier.priceUnit}
            </span>
          )}
        </div>
        <p
          className={`mt-1 text-caption ${
            featured ? 'text-white/70' : 'text-brand-text-muted'
          }`}
        >
          {tier.priceNote}
        </p>
      </div>

      {/* Features */}
      <ul className="mt-6 space-y-2.5">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-caption">
            <Check
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                featured ? 'text-white' : 'text-brand-secondary'
              }`}
            />
            <span
              className={`leading-relaxed ${
                featured ? 'text-white/90' : 'text-brand-text'
              }`}
              dangerouslySetInnerHTML={{ __html: f }}
            />
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-8 flex-1" />
      <Link
        href={tier.cta.href}
        className={`group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-body font-semibold transition-all ${
          featured
            ? 'bg-white text-brand-primary shadow-button hover:brightness-95 active:scale-[0.98]'
            : 'bg-brand-primary text-white shadow-button hover:brightness-110 active:scale-[0.98]'
        }`}
      >
        {tier.cta.label}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </article>
  );
}
