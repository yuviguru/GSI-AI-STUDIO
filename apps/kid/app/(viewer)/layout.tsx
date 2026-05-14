import Link from 'next/link';

export default function ViewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* Minimal branding header */}
      <header className="sticky top-0 z-50 flex items-center justify-center border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/gsi-logo.svg"
            alt="GSI"
            className="h-8 w-auto"
          />
          <span className="font-display text-lg font-bold text-brand-purple">
            AI Studio
          </span>
        </Link>
      </header>
      {children}
    </div>
  );
}
