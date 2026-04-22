import type { Metadata } from 'next';
import { TeacherSignupFlow } from '@/components/teacher/TeacherSignupFlow';

export const metadata: Metadata = {
  title: 'Teacher sign-in · GSI AI Studio',
};

export default function TeacherLoginPage() {
  return (
    <div className="py-8">
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-bold text-gray-900">Welcome, teacher</h1>
        <p className="mt-2 text-sm text-gray-500">
          Sign in with your phone, then enter your school code to unlock the teacher dashboard.
        </p>
      </div>
      <TeacherSignupFlow />
    </div>
  );
}
