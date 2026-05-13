import type { Metadata } from 'next';
import { TeacherSignInChoice } from '@/components/teacher/TeacherSignInChoice';

export const metadata: Metadata = {
  title: 'Teacher sign-in · GSI for Schools',
};

export default function TeacherLoginPage() {
  return (
    <div className="mx-auto max-w-sm py-10">
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-bold text-brand-text">Welcome, teacher</h1>
        <p className="mt-2 text-sm text-brand-text-secondary">
          Sign in with your work email — we&apos;ll send you a one-time link.
        </p>
      </div>
      <TeacherSignInChoice />
    </div>
  );
}
