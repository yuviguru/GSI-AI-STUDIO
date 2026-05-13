import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-card">
        <p className="font-mono text-sm font-bold uppercase tracking-wider text-brand-text-muted">
          404
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-brand-text">Page not found</h1>
        <p className="mt-2 text-sm text-brand-text-secondary">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/teacher"
            className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Teacher dashboard
          </Link>
          <Link
            href="/school"
            className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-brand-text"
          >
            School dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
