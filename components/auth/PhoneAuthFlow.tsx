'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getRecaptchaVerifier, sendPhoneOtp, auth } from '@/lib/firebase/client';
import type { ConfirmationResult } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';

type Step = 'phone' | 'name' | 'success';

interface PhoneAuthFlowProps {
  onComplete?: () => void;
  onClose?: () => void;
  defaultRole?: 'parent' | 'teacher';
}

const stepVariants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

export function PhoneAuthFlow({ onComplete, onClose, defaultRole = 'parent' }: PhoneAuthFlowProps) {
  const { refreshProfile } = useAuth();

  // ── State ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('phone');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Consent + Phone
  const [consentChecked, setConsentChecked] = useState(false);
  const [phone, setPhone] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  // OTP (inline below phone)
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Name
  const [name, setName] = useState('');
  const [role] = useState<'parent' | 'teacher'>(defaultRole);

  // reCAPTCHA container ref
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // ── Phone OTP ─────────────────────────────────────────────────────────

  async function handleSendOtp() {
    setError(null);

    if (!consentChecked) {
      setError('Please confirm you are a parent/guardian and agree to the terms');
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        throw new Error('Please enter a valid 10-digit phone number');
      }

      const verifier = getRecaptchaVerifier('recaptcha-container');
      const result = await sendPhoneOtp(cleanPhone, verifier);
      setConfirmation(result);
      setOtpSent(true);
      setResendCooldown(30);

      // Auto-focus first OTP input
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
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

  // ── OTP Input ─────────────────────────────────────────────────────────

  const handleOtpChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

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
      const user = auth.currentUser;
      if (!user) throw new Error('Authentication failed');

      const token = await user.getIdToken();
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await refreshProfile();
        setStep('success');
      } else {
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

  function handleChangeNumber() {
    setOtpSent(false);
    setConfirmation(null);
    setOtp(['', '', '', '', '', '']);
    setError(null);
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setOtp(['', '', '', '', '', '']);
    setError(null);
    await handleSendOtp();
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
        body: JSON.stringify({ name: name.trim(), role }),
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

  // ── Render ────────────────────────────────────────────────────────────

  const canSendOtp = consentChecked && phone.replace(/\D/g, '').length === 10 && !loading;

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-6">
      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container" ref={recaptchaContainerRef} />

      <AnimatePresence mode="wait">
        {/* ─── Step 1: Phone + Consent + Inline OTP ─── */}
        {step === 'phone' && (
          <motion.div
            key="phone"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="text-center">
              <span className="text-4xl">📱</span>
              <h2 className="mt-2 text-xl font-bold text-gray-900">Sign in to GSI AI Studio</h2>
              <p className="mt-1 text-sm text-gray-500">
                {otpSent
                  ? `Enter the code sent to +91 ${phone}`
                  : "We'll send a verification code via SMS"}
              </p>
            </div>

            {/* Phone input */}
            <div className="flex items-center gap-2">
              <span className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-medium text-gray-600">
                🇮🇳 +91
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                  if (otpSent) handleChangeNumber();
                }}
                placeholder="10-digit number"
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                autoFocus={!otpSent}
                maxLength={10}
                disabled={otpSent}
              />
              {otpSent && (
                <button
                  onClick={handleChangeNumber}
                  className="text-xs text-purple-600 hover:text-purple-700"
                >
                  Change
                </button>
              )}
            </div>

            {/* OTP input — shown inline after sending */}
            <AnimatePresence>
              {otpSent && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3 overflow-hidden"
                >
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
                      />
                    ))}
                  </div>

                  {loading && (
                    <p className="text-center text-sm text-gray-500">Verifying...</p>
                  )}

                  <div className="text-center">
                    <button
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0}
                      className={cn(
                        'text-xs',
                        resendCooldown > 0 ? 'text-gray-400' : 'text-purple-600 hover:text-purple-700'
                      )}
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Consent checkbox — shown before OTP is sent */}
            {!otpSent && (
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-xs leading-relaxed text-gray-500">
                  I am a parent/guardian, 18 years or older, and I agree to the{' '}
                  <a href="/terms" className="text-purple-600 underline hover:text-purple-700">
                    Terms &amp; Conditions
                  </a>
                  {' '}and{' '}
                  <a href="/privacy" className="text-purple-600 underline hover:text-purple-700">
                    Privacy Policy
                  </a>
                </span>
              </label>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
                {error}
              </p>
            )}

            {/* Send OTP button — only shown before OTP is sent */}
            {!otpSent && (
              <button
                onClick={handleSendOtp}
                disabled={!canSendOtp}
                className={cn(
                  'w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
                  canSendOtp
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-gray-300 cursor-not-allowed'
                )}
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            )}

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

        {/* ─── Step 2: Name (new users only) ─── */}
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

        {/* ─── Step 3: Success ─── */}
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
