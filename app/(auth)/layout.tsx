import Link from 'next/link';
import { AuthProvider } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/gsi-logo.svg" alt="GSI" className="h-8 w-auto" />
                <span className="font-display text-lg font-bold text-brand-purple">
                  GSI for Schools
                </span>
              </Link>
              <nav className="flex items-center gap-4 text-sm font-medium text-gray-600">
                <Link href="/teacher" className="hover:text-brand-purple">
                  Teachers
                </Link>
                <Link href="/school" className="hover:text-brand-purple">
                  School
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}
