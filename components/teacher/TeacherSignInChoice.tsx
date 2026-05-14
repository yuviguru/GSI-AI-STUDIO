'use client';

import { useState } from 'react';
import { Mail, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmailMagicLinkFlow } from '@/components/auth/EmailMagicLinkFlow';
import { TeacherSignupFlow } from '@/components/teacher/TeacherSignupFlow';

/**
 * Wraps the school portal sign-in with a method picker:
 *   - Email magic link (primary — recommended; institutional appropriate)
 *   - Phone OTP (fallback — for teachers without institutional email)
 *
 * Once the user signs in via either, TeacherSignupFlow takes over the
 * school-code + onboarding stages. School admins use the same picker, but
 * we recommend email-only for them in our docs.
 */
type Method = 'email' | 'phone';

export function TeacherSignInChoice() {
  const [method, setMethod] = useState<Method>('email');

  return (
    <div className="rounded-3xl bg-white p-5 shadow-card">
      <div role="tablist" className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-gray-100 p-1">
        <button
          type="button"
          role="tab"
          aria-selected={method === 'email'}
          onClick={() => setMethod('email')}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
            method === 'email'
              ? 'bg-white text-brand-text shadow-soft'
              : 'text-brand-text-secondary hover:text-brand-text',
          )}
        >
          <Mail className="h-3.5 w-3.5" />
          Email link
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={method === 'phone'}
          onClick={() => setMethod('phone')}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
            method === 'phone'
              ? 'bg-white text-brand-text shadow-soft'
              : 'text-brand-text-secondary hover:text-brand-text',
          )}
        >
          <Smartphone className="h-3.5 w-3.5" />
          Phone OTP
        </button>
      </div>

      {method === 'email' ? (
        <>
          <EmailMagicLinkFlow />
          <p className="mt-4 text-center text-[11px] text-brand-text-muted">
            No email? Switch to phone OTP above.
          </p>
        </>
      ) : (
        <TeacherSignupFlow />
      )}
    </div>
  );
}
