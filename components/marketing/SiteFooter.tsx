import Link from 'next/link';
import Image from 'next/image';

interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

const COLUMNS: FooterColumn[] = [
  {
    title: 'Studios',
    links: [
      { label: 'Story Studio', href: '/create/story' },
      { label: 'Music Lab', href: '/create/music' },
      { label: 'Quiz Maker', href: '/create/quiz' },
      { label: 'Game Studio', href: '/create/game' },
      { label: 'Comic Studio', href: '/create/comic' },
      { label: 'Beat the AI', href: '/beat-the-ai' },
      { label: 'Kid CEO', href: '/ceo' },
      { label: 'Skill Arena', href: '/skill-arena' },
      { label: 'AI X-Ray', href: '/learn' },
      { label: 'Explore feed', href: '/explore' },
    ],
  },
  {
    title: 'For parents',
    links: [
      { label: 'How it works', href: '/help#the-parent-experience' },
      { label: 'Safety &amp; privacy', href: '/help#safety-privacy-and-compliance' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Weekly progress reports', href: '/help#the-parent-experience' },
      { label: 'Parent FAQ', href: '/help#the-parent-experience' },
      { label: 'Contact support', href: 'mailto:hello@gsi.ai' },
    ],
  },
  {
    title: 'For schools',
    links: [
      { label: 'Book a pilot', href: '/school' },
      { label: 'CBSE AI curriculum', href: '/help#the-teacher-experience' },
      { label: 'Teacher dashboard', href: '/teacher' },
      { label: 'Lesson plans', href: '/help#the-teacher-experience' },
      { label: 'Compliance reports', href: '/help#the-school-admin-experience' },
      { label: 'Inter-school competitions', href: '/help#the-school-admin-experience' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'Product walkthrough', href: '/help' },
      { label: 'What is AI literacy?', href: '/learn' },
      { label: 'CBSE alignment', href: '/help#the-teacher-experience' },
      { label: 'Koko the AI buddy', href: '/learn' },
      { label: 'For educators', href: '/school' },
      { label: 'Blog', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About GSI', href: '#' },
      { label: 'Made in Chennai', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Press kit', href: '#' },
      { label: 'Contact', href: 'mailto:hello@gsi.ai' },
    ],
  },
];

const LEGAL = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'DPDPA notice', href: '/privacy#dpdpa' },
  { label: 'Cookies', href: '/privacy#cookies' },
  { label: 'Child safety', href: '#safety' },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-brand-border bg-brand-background">
      <div className="mx-auto max-w-screen-xl px-5 py-16 sm:px-6 sm:py-20">
        {/* Top: logo + columns */}
        <div className="grid gap-10 lg:grid-cols-[1.2fr_3fr] lg:gap-16">
          {/* Brand block */}
          <div>
            <Link href="/welcome" className="flex items-center gap-2">
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
            <p className="mt-4 max-w-xs text-caption leading-relaxed text-brand-text-secondary">
              AI literacy, learned by creating. Built in Chennai for the 26
              crore kids entering India&apos;s new AI curriculum.
            </p>

            {/* Region + language */}
            <div className="mt-6 flex items-center gap-2 rounded-lg border border-brand-border bg-white px-3 py-2 text-caption font-medium text-brand-text">
              <span aria-hidden>🇮🇳</span>
              <span>India · English</span>
              <span className="ml-auto text-brand-text-muted">
                Tamil · Hindi coming 2026
              </span>
            </div>
          </div>

          {/* Columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="font-display text-caption font-bold uppercase tracking-wide text-brand-text">
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-caption text-brand-text-secondary transition-colors hover:text-brand-text"
                        dangerouslySetInnerHTML={{ __html: l.label }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col gap-4 border-t border-brand-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-brand-text-muted">
            © {new Date().getFullYear()} GSI AI Studio. Built with care in Chennai.
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-caption text-brand-text-secondary transition-colors hover:text-brand-text"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
