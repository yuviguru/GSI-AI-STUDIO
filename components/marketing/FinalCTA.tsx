import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-screen-xl px-5 sm:px-6">
        <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-brand-primary via-brand-ai to-brand-primary px-6 py-16 text-center sm:px-10 sm:py-20 lg:py-24">
          {/* Ambient dots */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-brand-accent/30 blur-3xl"
          />

          {/* Pixie — top-right, peeking into the CTA */}
          <div className="pointer-events-none absolute right-6 top-6 hidden sm:block lg:right-14 lg:top-10">
            <div className="rounded-full bg-white/15 p-2 backdrop-blur-sm">
              <MascotAvatar id="pixie" size="xl" ariaLabel="Pixie celebrating" />
            </div>
          </div>

          <div className="relative mx-auto max-w-2xl">
            <p className="text-caption font-semibold uppercase tracking-wide text-white/80">
              Ready when your kid is
            </p>
            <h2 className="mt-3 font-display text-[32px] font-extrabold leading-tight tracking-tight text-white text-balance sm:text-[48px] lg:text-[56px]">
              From idea to finished story — before the kettle boils.
            </h2>
            <p className="mt-5 text-body-lg leading-relaxed text-white/85">
              Hand them the screen tonight, see what comes back by dinner. No
              card. No signup wall. Just the proof — on their face and in your
              WhatsApp.
            </p>

            {/* CTAs */}
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/create/story"
                className="group inline-flex h-13 items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-body-lg font-semibold text-brand-primary shadow-elevated transition-all hover:brightness-95 active:scale-[0.98]"
              >
                Start creating — free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/school"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-8 py-3.5 text-body-lg font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                Talk to our schools team
              </Link>
            </div>

            <p className="mt-6 text-caption text-white/70">
              Free forever · 3 creations a day · All 10 studios · Made in Chennai
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
