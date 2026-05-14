import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="text-5xl">🔍</span>
      <h1 className="mt-4 font-display text-2xl font-bold text-gray-900">
        Page not found
      </h1>
      <p className="mt-2 text-gray-500">
        Oops! We couldn&apos;t find what you were looking for.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-full bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/25 transition-transform hover:scale-105 active:scale-95"
      >
        Back to Home
      </Link>
    </main>
  );
}
