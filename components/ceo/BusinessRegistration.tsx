'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { BUSINESS_TYPE_DEFAULT_NAMES, STARTING_CAPITAL } from '@/lib/ceo/constants';
import { Mascot } from '@/components/mascot/Mascot';
import { cn } from '@/lib/utils';
import businessesJson from '@/lib/ceo/templates/businesses.json';
import type { CeoBusinessType, CeoPace } from '@/types';

interface BusinessTemplate {
  type: CeoBusinessType;
  name: string;
  emoji: string;
  startingCapital: number;
  tagline: string;
  locationHints: string[];
  firstEventHints?: string[];
}

const BUSINESSES = businessesJson as unknown as BusinessTemplate[];

const LOCATION_OPTIONS = ['Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune'];

const PACE_OPTIONS: Array<{ key: CeoPace; label: string; desc: string }> = [
  { key: '15', label: 'Snappy', desc: 'Big decision every day · ~15 days' },
  { key: '30', label: 'Balanced', desc: 'Big decision most days · ~30 days' },
  { key: '45', label: 'Deep', desc: 'Big decision every 2 days · ~45 days' },
];

interface BusinessRegistrationProps {
  onSubmit: (params: {
    businessType: CeoBusinessType;
    businessName?: string;
    customBusinessDescription?: string;
    location: string;
    pace: CeoPace;
  }) => Promise<void>;
  submitting?: boolean;
}

export function BusinessRegistration({ onSubmit, submitting = false }: BusinessRegistrationProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<CeoBusinessType | null>(null);
  const [customDesc, setCustomDesc] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [pace, setPace] = useState<CeoPace>('30');

  const selected = type ? BUSINESSES.find((b) => b.type === type) : null;
  const canStep2 = !!type && (type !== 'custom' || customDesc.trim().length >= 3);
  const effectiveLocation = location === 'custom' ? customCity.trim() : location;
  const canStep3 = effectiveLocation.length > 0;

  const handleSubmit = async () => {
    if (!type) return;
    await onSubmit({
      businessType: type,
      businessName: name.trim() || undefined,
      customBusinessDescription: type === 'custom' ? customDesc.trim() : undefined,
      location: effectiveLocation,
      pace,
    });
  };

  return (
    <div className="space-y-6">
      <StepIndicator step={step} />

      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-start gap-3">
            <Mascot expression="thinking" size="sm" />
            <p className="text-sm text-slate-600">Which business feels like you?</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {BUSINESSES.map((b) => (
              <button
                key={b.type}
                type="button"
                onClick={() => setType(b.type)}
                className={cn(
                  'rounded-2xl border p-4 text-left min-h-[140px] flex flex-col gap-1 transition',
                  type === b.type
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-slate-200 bg-white hover:border-slate-300',
                )}
              >
                <div className="text-3xl">{b.emoji}</div>
                <div className="font-semibold text-sm">{b.name}</div>
                <div className="text-xs text-slate-500">₹{b.startingCapital.toLocaleString('en-IN')} to start</div>
                <div className="text-xs text-slate-500 line-clamp-2">{b.tagline}</div>
              </button>
            ))}
          </div>
          {type === 'custom' && (
            <textarea
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              placeholder="What's your business idea?"
              rows={3}
              maxLength={200}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          )}
          <div className="flex justify-end">
            <PrimaryButton disabled={!canStep2} onClick={() => setStep(2)}>
              Next <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Business name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type ? BUSINESS_TYPE_DEFAULT_NAMES[type] : 'Your business name'}
              maxLength={60}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm min-h-[48px]"
            />
            <p className="mt-1 text-xs text-slate-500">Optional — we&apos;ll use a default if you skip.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Where will you run it?</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {LOCATION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setLocation(opt)}
                  className={cn(
                    'rounded-full px-3 py-2 text-sm border min-h-[40px]',
                    location === opt ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white border-slate-200 text-slate-700',
                  )}
                >
                  {opt}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setLocation('custom')}
                className={cn(
                  'rounded-full px-3 py-2 text-sm border min-h-[40px]',
                  location === 'custom' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white border-slate-200 text-slate-700',
                )}
              >
                My own city
              </button>
            </div>
            {location === 'custom' && (
              <input
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                placeholder="Your city"
                maxLength={60}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm min-h-[48px]"
              />
            )}
            {selected && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selected.locationHints.slice(0, 2).map((hint) => (
                  <span key={hint} className="text-xs bg-slate-50 text-slate-600 rounded-full px-2 py-1">
                    💡 {hint}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-between">
            <SecondaryButton onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </SecondaryButton>
            <PrimaryButton disabled={!canStep3} onClick={() => setStep(3)}>
              Next <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Pick your pace</label>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
              {PACE_OPTIONS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPace(p.key)}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition',
                    pace === p.key
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                      : 'border-slate-200 bg-white hover:border-slate-300',
                  )}
                >
                  <div className="text-2xl font-bold">{p.key} days</div>
                  <div className="font-semibold text-sm">{p.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between">
            <SecondaryButton onClick={() => setStep(2)} disabled={submitting}>
              <ArrowLeft className="h-4 w-4" /> Back
            </SecondaryButton>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold px-6 py-3 min-h-[48px] disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {submitting ? 'Starting...' : 'Start Your Business!'}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const labels = ['Pick', 'Setup', 'Pace'];
  return (
    <div className="flex items-center gap-2 text-xs">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                'h-6 w-6 rounded-full flex items-center justify-center font-semibold',
                done
                  ? 'bg-teal-500 text-white'
                  : active
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-200 text-slate-500',
              )}
            >
              {n}
            </div>
            <span className={cn(active ? 'text-slate-900 font-medium' : 'text-slate-500')}>{label}</span>
            {i < labels.length - 1 && <span className="text-slate-300">·</span>}
          </div>
        );
      })}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 text-white font-semibold px-4 py-2 min-h-[44px] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 text-slate-700 font-medium px-4 py-2 min-h-[44px] disabled:opacity-50"
    >
      {children}
    </button>
  );
}
