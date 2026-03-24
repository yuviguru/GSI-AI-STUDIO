'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { createRecaptchaVerifier, sendOtp, auth } from '@/lib/firebase/client';
import type { ConfirmationResult, ApplicationVerifier } from 'firebase/auth';

type Step = 'age-gate' | 'phone' | 'otp' | 'success';

interface PhoneAuthFlowProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 80 }, (_, i) => CURRENT_YEAR - 18 - i);

export function PhoneAuthFlow({ onSuccess, onClose }: PhoneAuthFlowProps) {
  const [step, setStep] = useState<Step>('age-gate');
  const [error, setError] = useState('');

  // Age gate state
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');

  // Phone state
  const [phone, setPhone] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const recaptchaRef = useRef<ApplicationVerifier | null>(null);

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Registration state
  const [name, setName] = useState('');
  const [registering, setRegistering] = useState(false);

  // Resend OTP cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // ─── Age Gate ─────────────────────────────────────────────────────────────────

  const handleAgeGate = useCallback(() => {
    setError('');
    const day = parseInt(dobDay, 10);
    const month = parseInt(dobMonth, 10);
    const year = parseInt(dobYear, 10);

    if (!day || !month || !year) {
      setError('Please enter your complete date of birth');
      return;
    }

    const dob = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      setError('A parent or guardian (18+) must create the account. Please ask a grown-up to help!');
      return;
    }

    setStep('phone');
  }, [dobDay, dobMonth, dobYear]);

  // ─── Phone Input ──────────────────────────────────────────────────────────────

  const handleSendOtp = useCallback(async () => {
    setError('');
    const cleanPhone = phone.replace(/\s/g, '');

    if (!/^\d{10}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setSendingOtp(true);
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = createRecaptchaVerifier('recaptcha-container');
      }

      const result = await sendOtp(`+91${cleanPhone}`, recaptchaRef.current);
      setConfirmation(result);
      setResendCooldown(30);
      setStep('otp');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP';
      if (message.includes('too-many-requests')) {
        setError('Too many attempts. Please try again later.');
      } else if (message.includes('invalid-phone-number')) {
        setError('Invalid phone number. Please check and try again.');
      } else {
        setError('Failed to send OTP. Please try again.');
      }
      // Reset reCAPTCHA on error
      recaptchaRef.current = null;
    } finally {
      setSendingOtp(false);
    }
  }, [phone]);

  // ─── OTP Verification ─────────────────────────────────────────────────────────

  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d?$/.test(value)) return;
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    },
    [otp]
  );

  const handleOtpKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !otp[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    },
    [otp]
  );

  const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  }, []);

  const handleVerifyOtp = useCallback(async () => {
    setError('');
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    if (!confirmation) {
      setError('Session expired. Please start over.');
      return;
    }

    setVerifying(true);
    try {
      await confirmation.confirm(code);
      setStep('success');

      // Register with backend
      setRegistering(true);
      const user = auth.currentUser;
      if (user) {
        const idToken = await user.getIdToken();
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ name: name || 'Parent', role: 'parent' }),
        });

        // Auto-claim session
        const sessionId = localStorage.getItem('gsi-session-id');
        if (sessionId) {
          await fetch('/api/auth/claim-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ sessionId }),
          });
        }
      }

      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      if (message.includes('invalid-verification-code')) {
        setError('Wrong code. Please check and try again.');
      } else if (message.includes('code-expired')) {
        setError('Code expired. Please request a new one.');
      } else {
        setError('Verification failed. Please try again.');
      }
    } finally {
      setVerifying(false);
      setRegistering(false);
    }
  }, [otp, confirmation, name, onSuccess]);

  const handleResendOtp = useCallback(async () => {
    if (resendCooldown > 0) return;
    recaptchaRef.current = null;
    setStep('phone');
    setOtp(['', '', '', '', '', '']);
  }, [resendCooldown]);

  // ─── Render ───────────────────────────────────────────────────────────────────

  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6">
      {/* Hidden reCAPTCHA container */}
      <div id="recaptcha-container" />

      <AnimatePresence mode="wait">
        {/* ─── Step 1: Age Gate ─────────────────────────────────────────── */}
        {step === 'age-gate' && (
          <motion.div
            key="age-gate"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="text-center">
              <span className="text-4xl">👋</span>
              <h2 className="mt-2 text-xl font-bold text-gray-900">
                Welcome, Parent or Guardian!
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                A parent or guardian must set up the account. Please enter your date of birth.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="DD"
                  min={1}
                  max={31}
                  value={dobDay}
                  onChange={(e) => setDobDay(e.target.value)}
                  className={cn(
                    'h-12 w-20 rounded-xl border-2 border-gray-200 text-center text-lg',
                    'focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100',
                  )}
                />
                <select
                  value={dobMonth}
                  onChange={(e) => setDobMonth(e.target.value)}
                  className={cn(
                    'h-12 flex-1 rounded-xl border-2 border-gray-200 px-3 text-lg',
                    'focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100',
                  )}
                >
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={dobYear}
                  onChange={(e) => setDobYear(e.target.value)}
                  className={cn(
                    'h-12 w-28 rounded-xl border-2 border-gray-200 px-3 text-lg',
                    'focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100',
                  )}
                >
                  <option value="">Year</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
            )}

            <button
              onClick={handleAgeGate}
              className={cn(
                'h-12 w-full rounded-full bg-indigo-500 font-semibold text-white',
                'hover:bg-indigo-600 active:scale-[0.98] transition-all',
              )}
            >
              Continue
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
              >
                Maybe later
              </button>
            )}
          </motion.div>
        )}

        {/* ─── Step 2: Phone Input ────────────────────────────────────── */}
        {step === 'phone' && (
          <motion.div
            key="phone"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="text-center">
              <span className="text-4xl">📱</span>
              <h2 className="mt-2 text-xl font-bold text-gray-900">
                Enter Your Phone Number
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {"We'll send a verification code via SMS"}
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Your Name</label>
              <input
                type="text"
                placeholder="e.g. Meena Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cn(
                  'h-12 w-full rounded-xl border-2 border-gray-200 px-4 text-lg',
                  'focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100',
                )}
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <div className="flex gap-2">
                <div className="flex h-12 items-center rounded-xl border-2 border-gray-200 bg-gray-50 px-3 text-lg font-medium text-gray-500">
                  +91
                </div>
                <input
                  type="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                  maxLength={12}
                  className={cn(
                    'h-12 flex-1 rounded-xl border-2 border-gray-200 px-4 text-lg tracking-wider',
                    'focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100',
                  )}
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
            )}

            <button
              onClick={handleSendOtp}
              disabled={sendingOtp}
              className={cn(
                'h-12 w-full rounded-full bg-indigo-500 font-semibold text-white',
                'hover:bg-indigo-600 active:scale-[0.98] transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {sendingOtp ? 'Sending...' : 'Send OTP'}
            </button>

            <button
              onClick={() => setStep('age-gate')}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
            >
              Back
            </button>
          </motion.div>
        )}

        {/* ─── Step 3: OTP Verification ───────────────────────────────── */}
        {step === 'otp' && (
          <motion.div
            key="otp"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="text-center">
              <span className="text-4xl">🔑</span>
              <h2 className="mt-2 text-xl font-bold text-gray-900">
                Enter Verification Code
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Sent to +91 {phone.replace(/\s/g, '').replace(/(\d{5})(\d{5})/, '$1 $2')}
              </p>
            </div>

            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className={cn(
                    'h-14 w-12 rounded-xl border-2 border-gray-200 text-center text-2xl font-bold',
                    'focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100',
                    digit && 'border-indigo-300 bg-indigo-50',
                  )}
                />
              ))}
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
            )}

            <button
              onClick={handleVerifyOtp}
              disabled={verifying || otp.join('').length !== 6}
              className={cn(
                'h-12 w-full rounded-full bg-indigo-500 font-semibold text-white',
                'hover:bg-indigo-600 active:scale-[0.98] transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {verifying ? 'Verifying...' : 'Verify'}
            </button>

            <div className="text-center">
              <button
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
                className={cn(
                  'text-sm text-indigo-500 hover:text-indigo-700',
                  'disabled:text-gray-400 disabled:cursor-not-allowed',
                )}
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend OTP'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Step 4: Success ────────────────────────────────────────── */}
        {step === 'success' && (
          <motion.div
            key="success"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-6 text-center"
          >
            <span className="text-5xl">🎉</span>
            <h2 className="text-xl font-bold text-gray-900">
              Welcome{name ? `, ${name}` : ''}!
            </h2>
            <p className="text-sm text-gray-500">
              {registering
                ? 'Setting up your account...'
                : 'Your account is ready. Your creations have been saved!'}
            </p>

            {!registering && onClose && (
              <button
                onClick={onClose}
                className={cn(
                  'h-12 w-full rounded-full bg-indigo-500 font-semibold text-white',
                  'hover:bg-indigo-600 active:scale-[0.98] transition-all',
                )}
              >
                Get Started
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
