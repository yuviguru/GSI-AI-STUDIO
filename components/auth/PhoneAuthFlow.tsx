'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getRecaptchaVerifier, sendPhoneOtp, auth } from '@/lib/firebase/client';
import type { ConfirmationResult } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';

type Step = 'age-gate' | 'phone' | 'otp' | 'name' | 'success';

interface PhoneAuthFlowProps {
  onComplete?: () => void;
  onClose?: () => void;
  defaultRole?: 'parent' | 'teacher';
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const stepVariants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

export function PhoneAuthFlow({ onComplete, onClose, defaultRole = 'parent' }: PhoneAuthFlowProps) {
  const { refreshProfile } = useAuth();

  // ── State ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('age-gate');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Age gate
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');

  // Phone
  const [phone, setPhone] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  // OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Name
  const [name, setName] = useState('');
  const [role] = useState<'parent' | 'teacher'>(defaultRole);

  // reCAPTCHA container ref
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // ── Age Gate ──────────────────────────────────────────────────────────

  function getDateOfBirth(): string {
    const y = birthYear.padStart(4, '0');
    const m = birthMonth.padStart(2, '0');
    const d = birthDay.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function calculateAge(): number {
    const dob = new Date(getDateOfBirth());
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  function handleAgeGate() {
    setError(null);
    if (!birthYear || !birthMonth || !birthDay) {
      setError('Please enter your full date of birth');
      return;
    }
    const age = calculateAge();
    if (age < 18) {
      setError('You must be 18 or older to create an account. Please ask a parent or guardian to set up the account for you.');
      return;
    }
    if (age > 120) {
      setError('Please enter a valid date of birth');
      return;
    }
    setStep('phone');
  }

  // ── Phone OTP ─────────────────────────────────────────────────────────

  async function handleSendOtp() {
    setError(null);
    setLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        throw new Error('Please enter a valid 10-digit phone number');
      }

      const verifier = getRecaptchaVerifier('recaptcha-container');
      const result = await sendPhoneOtp(cleanPhone, verifier);
      setConfirmation(result);
      setStep('otp');
      setResendCooldown(30);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP';
      if (message.includes('too-many-requests')) {
        setError('Too many attempts. Please try again later.');
      } else if (message.includes('invalid-phone-number')) {
        setError('Invalid phone number. Please check and try again.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // ── OTP Verification ──────────────────────────────────────────────────

  const handleOtpChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }, [otp]);

  // Auto-verify when all 6 digits entered
  useEffect(() => {
    const code = otp.join('');
    if (code.length === 6 && confirmation) {
      verifyOtp(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, confirmation]);

  async function verifyOtp(code: string) {
    if (!confirmation) return;
    setError(null);
    setLoading(true);

    try {
      await confirmation.confirm(code);
      // Firebase Auth user is now set — check if user already registered
      const user = auth.currentUser;
      if (!user) throw new Error('Authentication failed');

      const token = await user.getIdToken();
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        // User already registered — go straight to success
        await refreshProfile();
        setStep('success');
      } else {
        // New user — collect name
        setStep('name');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid OTP';
      if (message.includes('invalid-verification-code')) {
        setError('Incorrect OTP. Please check and try again.');
      } else if (message.includes('code-expired')) {
        setError('OTP has expired. Please request a new one.');
      } else {
        setError(message);
      }
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setOtp(['', '', '', '', '', '']);
    setStep('phone');
  }

  // ── Name & Registration ───────────────────────────────────────────────

  async function handleRegister() {
    setError(null);
    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter your name (at least 2 characters)');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          role,
          dateOfBirth: getDateOfBirth(),
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Registration failed');
      }

      await refreshProfile();
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  // ── Auto-dismiss success ──────────────────────────────────────────────

  useEffect(() => {
    if (step !== 'success') return;
    const timer = setTimeout(() => onComplete?.(), 2500);
    return () => clearTimeout(timer);
  }, [step, onComplete]);

  // ── Year options (18+ means born before current year - 18) ────────────

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 80 }, (_, i) => currentYear - 18 - i);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-6">
      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container" ref={recaptchaContainerRef} />

      <AnimatePresence mode="wait">
        {/* ─── Step 1: Age Gate ─── */}
        {step === 'age-gate' && (
          <motion.div
            key="age-gate"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="text-center">
              <span className="text-4xl">👨‍👩‍👧‍👦</span>
              <h2 className="mt-2 text-xl font-bold text-gray-900">Are you a parent or guardian?</h2>
              <p className="mt-1 text-sm text-gray-500">
                A parent or guardian must set up the account.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Your date of birth
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={birthDay}
                  onChange={(e) => setBirthDay(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                >
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <select
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                >
                  <option value="">Month</option>
                  {MONTHS.map((month, i) => (
                    <option key={month} value={String(i + 1)}>
                      {month}
                    </option>
                  ))}
                </select>
                <select
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                >
                  <option value="">Year</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              onClick={handleAgeGate}
              className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 active:scale-[0.98]"
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

        {/* ─── Step 2: Phone Input ─── */}
        {step === 'phone' && (
          <motion.div
            key="phone"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="text-center">
              <span className="text-4xl">📱</span>
              <h2 className="mt-2 text-xl font-bold text-gray-900">Enter your phone number</h2>
              <p className="mt-1 text-sm text-gray-500">
                We&apos;ll send a verification code via SMS
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-medium text-gray-600">
                🇮🇳 +91
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit number"
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                autoFocus
                maxLength={10}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              onClick={handleSendOtp}
              disabled={loading || phone.replace(/\D/g, '').length !== 10}
              className={cn(
                'w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
                loading || phone.replace(/\D/g, '').length !== 10
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700'
              )}
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>

            <button
              onClick={() => setStep('age-gate')}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
            >
              ← Back
            </button>
          </motion.div>
        )}

        {/* ─── Step 3: OTP Verification ─── */}
        {step === 'otp' && (
          <motion.div
            key="otp"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="text-center">
              <span className="text-4xl">🔐</span>
              <h2 className="mt-2 text-xl font-bold text-gray-900">Enter verification code</h2>
              <p className="mt-1 text-sm text-gray-500">
                Sent to +91 {phone}
              </p>
            </div>

            <div className="flex justify-center gap-2">
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
                    'h-12 w-10 rounded-xl border text-center text-lg font-bold transition',
                    'focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100',
                    digit ? 'border-purple-300 bg-purple-50' : 'border-gray-200'
                  )}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
                {error}
              </p>
            )}

            {loading && (
              <p className="text-center text-sm text-gray-500">Verifying...</p>
            )}

            <div className="text-center">
              <button
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
                className={cn(
                  'text-sm',
                  resendCooldown > 0 ? 'text-gray-400' : 'text-purple-600 hover:text-purple-700'
                )}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>

            <button
              onClick={() => { setStep('phone'); setError(null); }}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
            >
              ← Change number
            </button>
          </motion.div>
        )}

        {/* ─── Step 4: Name ─── */}
        {step === 'name' && (
          <motion.div
            key="name"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="text-center">
              <span className="text-4xl">✨</span>
              <h2 className="mt-2 text-xl font-bold text-gray-900">Almost there!</h2>
              <p className="mt-1 text-sm text-gray-500">What should we call you?</p>
            </div>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              autoFocus
              maxLength={50}
            />

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              onClick={handleRegister}
              disabled={loading || name.trim().length < 2}
              className={cn(
                'w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
                loading || name.trim().length < 2
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700'
              )}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </motion.div>
        )}

        {/* ─── Step 5: Success ─── */}
        {step === 'success' && (
          <motion.div
            key="success"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-4 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <span className="text-6xl">🎉</span>
            </motion.div>
            <h2 className="text-xl font-bold text-gray-900">Welcome!</h2>
            <p className="text-sm text-gray-500">Your account is ready. Let&apos;s start creating!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
