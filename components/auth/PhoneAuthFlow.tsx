'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getRecaptchaVerifier, sendPhoneOtp, auth } from '@/lib/firebase/client';
import type { ConfirmationResult } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';

type Step = 'phone' | 'success';

interface PhoneAuthFlowProps {
  onComplete?: () => void;
  onClose?: () => void;
}

const stepVariants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

/**
 * Phone OTP auth flow — simplified.
 * No name collection. Auto-registers after OTP verification.
 * The layout gate handles kid profile setup after auth.
 */
export function PhoneAuthFlow({ onComplete, onClose }: PhoneAuthFlowProps) {
  const { refreshProfile } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Consent + Phone
  const [consentChecked, setConsentChecked] = useState(false);
  const [phone, setPhone] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  // OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);

  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // ── Send OTP ──────────────────────────────────────────────────────────

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

  // Resend cooldown
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
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  }, [otp]);

  const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }, [otp]);

  // Auto-verify when all 6 digits entered
  useEffect(() => {
    const code = otp.join('');
    if (code.length === 6 && confirmation) verifyOtp(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, confirmation]);

  // ── Verify OTP + auto-register ────────────────────────────────────────

  async function verifyOtp(code: string) {
    if (!confirmation) return;
    setError(null);
    setLoading(true);

    try {
      await confirmation.confirm(code);
      const user = auth.currentUser;
      if (!user) throw new Error('Authentication failed');

      // Auto-register: create user doc if it doesn't exist (silent, no user input)
      const token = await user.getIdToken();
      const meRes = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!meRes.ok) {
        // New user — auto-register with default role
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: 'parent' }),
        });
      }

      await refreshProfile();
      setStep('success');
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

  // ── Auto-dismiss success → layout gate handles kid setup ──────────────

  useEffect(() => {
    if (step !== 'success') return;
    const timer = setTimeout(() => onComplete?.(), 1500);
    return () => clearTimeout(timer);
  }, [step, onComplete]);

  const canSendOtp = consentChecked && phone.replace(/\D/g, '').length === 10 && !loading;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-6">
      <div id="recaptcha-container" ref={recaptchaContainerRef} />

      <AnimatePresence mode="wait">
        {/* ─── Phone + Consent + Inline OTP ─── */}
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
                <button onClick={handleChangeNumber} className="text-xs text-purple-600 hover:text-purple-700">
                  Change
                </button>
              )}
            </div>

            {/* OTP input — inline after sending */}
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
                  {loading && <p className="text-center text-sm text-gray-500">Verifying...</p>}
                  <div className="text-center">
                    <button
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0}
                      className={cn('text-xs', resendCooldown > 0 ? 'text-gray-400' : 'text-purple-600 hover:text-purple-700')}
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Consent checkbox — before OTP sent */}
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
              <p className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">{error}</p>
            )}

            {!otpSent && (
              <button
                onClick={handleSendOtp}
                disabled={!canSendOtp}
                className={cn(
                  'w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
                  canSendOtp ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-300 cursor-not-allowed'
                )}
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            )}

            {onClose && (
              <button onClick={onClose} className="w-full text-center text-sm text-gray-400 hover:text-gray-600">
                Maybe later
              </button>
            )}
          </motion.div>
        )}

        {/* ─── Success ─── */}
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
            <h2 className="text-xl font-bold text-gray-900">You&apos;re in!</h2>
            <p className="text-sm text-gray-500">Setting things up...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
