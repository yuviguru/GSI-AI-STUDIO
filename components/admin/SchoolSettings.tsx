'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Board, SchoolDoc, SchoolPlan } from '@/types/user.types';

type Tab = 'general' | 'branding' | 'plan';

interface Props {
  school: SchoolDoc;
  onUpdated: (next: SchoolDoc) => void;
}

const BOARDS: Board[] = ['cbse', 'icse', 'state'];
const PLANS: SchoolPlan[] = ['trial', 'basic', 'premium'];

export function SchoolSettings({ school, onUpdated }: Props) {
  const [tab, setTab] = useState<Tab>('general');

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <nav className="flex border-b border-slate-200" role="tablist">
        {(['general', 'branding', 'plan'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'border-b-2 border-indigo-600 text-indigo-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>
      <div className="p-6">
        {tab === 'general' && <GeneralTab school={school} onUpdated={onUpdated} />}
        {tab === 'branding' && <BrandingTab school={school} onUpdated={onUpdated} />}
        {tab === 'plan' && <PlanTab school={school} onUpdated={onUpdated} />}
      </div>
    </div>
  );
}

// ───────────────────────────────── General ─────────────────────────────────

function GeneralTab({ school, onUpdated }: Props) {
  const { getIdToken } = useAuth();
  const [name, setName] = useState(school.name);
  const [city, setCity] = useState(school.city);
  const [stateName, setStateName] = useState(school.state);
  const [board, setBoard] = useState<Board>(school.board);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/schools/${school.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, city, state: stateName, board }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'Update failed');
      onUpdated(json.data as SchoolDoc);
      setMessage('Saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Field label="School name">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={120}
          required
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="City">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            minLength={2}
            maxLength={80}
            required
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>
        <Field label="State">
          <input
            type="text"
            value={stateName}
            onChange={(e) => setStateName(e.target.value)}
            minLength={2}
            maxLength={80}
            required
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>
      </div>
      <Field label="Board">
        <select
          value={board}
          onChange={(e) => setBoard(e.target.value as Board)}
          className="w-full rounded border border-slate-300 px-3 py-2"
        >
          {BOARDS.map((b) => (
            <option key={b} value={b}>
              {b.toUpperCase()}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {message && <span className="text-sm text-slate-600">{message}</span>}
      </div>
    </form>
  );
}

// ───────────────────────────────── Branding ────────────────────────────────

function BrandingTab({ school, onUpdated }: Props) {
  const { getIdToken } = useAuth();
  const [primaryColor, setPrimaryColor] = useState(
    school.branding?.primaryColor ?? '#4F46E5',
  );
  const [secondaryColor, setSecondaryColor] = useState(
    school.branding?.secondaryColor ?? '#EC4899',
  );
  const [message, setMessage] = useState<string | null>(null);
  const [savingColors, setSavingColors] = useState(false);

  async function handleColorSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingColors(true);
    setMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/schools/${school.id}/branding`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ primaryColor, secondaryColor }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'Update failed');
      onUpdated(json.data as SchoolDoc);
      setMessage('Colors saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSavingColors(false);
    }
  }

  async function handleUpload(kind: 'logo' | 'letterhead', file: File) {
    const token = await getIdToken();
    const form = new FormData();
    form.append('type', kind);
    form.append('file', file);
    const res = await fetch(`/api/schools/${school.id}/assets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message ?? 'Upload failed');
    onUpdated({
      ...school,
      branding: {
        ...school.branding,
        [kind === 'logo' ? 'logoUrl' : 'letterheadUrl']: json.data.url,
      },
    });
  }

  async function handleRemove(kind: 'logo' | 'letterhead') {
    const token = await getIdToken();
    const res = await fetch(`/api/schools/${school.id}/assets?type=${kind}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    onUpdated({
      ...school,
      branding: {
        ...school.branding,
        [kind === 'logo' ? 'logoUrl' : 'letterheadUrl']: undefined,
      },
    });
  }

  return (
    <div className="space-y-6">
      <AssetUploader
        label="School logo"
        help="PNG or JPG, max 2MB. Shown on PDF exports (HPC narratives, question papers, compliance reports)."
        currentUrl={school.branding?.logoUrl}
        onUpload={(f) => handleUpload('logo', f)}
        onRemove={() => handleRemove('logo')}
      />
      <AssetUploader
        label="Letterhead"
        help="PNG or JPG, A4 aspect recommended. Used as the top banner on long-form PDF reports."
        currentUrl={school.branding?.letterheadUrl}
        onUpload={(f) => handleUpload('letterhead', f)}
        onRemove={() => handleRemove('letterhead')}
      />
      <form className="space-y-3" onSubmit={handleColorSubmit}>
        <h3 className="text-sm font-semibold text-slate-900">Brand colors</h3>
        <div className="grid grid-cols-2 gap-4">
          <ColorField
            label="Primary"
            value={primaryColor}
            onChange={setPrimaryColor}
          />
          <ColorField
            label="Secondary"
            value={secondaryColor}
            onChange={setSecondaryColor}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={savingColors}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {savingColors ? 'Saving…' : 'Save colors'}
          </button>
          {message && <span className="text-sm text-slate-600">{message}</span>}
        </div>
      </form>
    </div>
  );
}

function AssetUploader(props: {
  label: string;
  help: string;
  currentUrl?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await props.onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded border border-slate-200 p-4">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{props.label}</h3>
        {props.currentUrl && (
          <button
            type="button"
            onClick={() => void props.onRemove()}
            className="text-xs text-red-600 hover:underline"
          >
            Remove
          </button>
        )}
      </div>
      <p className="mb-3 text-xs text-slate-500">{props.help}</p>
      {props.currentUrl && (
        <img
          src={props.currentUrl}
          alt={props.label}
          className="mb-3 max-h-24 rounded border border-slate-200 bg-slate-50 p-2"
        />
      )}
      <input
        type="file"
        accept="image/png,image/jpeg"
        onChange={onFileChange}
        disabled={busy}
        className="block text-sm"
      />
      {busy && <p className="mt-2 text-xs text-slate-500">Uploading…</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-14 cursor-pointer rounded border border-slate-300"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern="^#[0-9a-fA-F]{6}$"
          className="w-28 rounded border border-slate-300 px-2 py-1 font-mono text-xs"
        />
      </span>
    </label>
  );
}

// ─────────────────────────────────── Plan ──────────────────────────────────

function PlanTab({ school, onUpdated }: Props) {
  const { getIdToken } = useAuth();
  const [plan, setPlan] = useState<SchoolPlan>(school.plan);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/schools/${school.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'Update failed');
      onUpdated(json.data as SchoolDoc);
      setMessage('Plan updated.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <div>
          <strong>Current plan:</strong> {school.plan}
        </div>
        <div>
          <strong>Students enrolled:</strong> {school.studentCount}
        </div>
      </div>
      <Field label="Plan tier">
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as SchoolPlan)}
          className="w-full rounded border border-slate-300 px-3 py-2"
        >
          {PLANS.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
      </Field>
      <p className="text-xs text-slate-500">
        Billing is handled offline during the pilot phase — contact your GSI account
        manager to finalize any upgrade before switching here.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || plan === school.plan}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Update plan'}
        </button>
        {message && <span className="text-sm text-slate-600">{message}</span>}
      </div>
    </form>
  );
}

// ───────────────────────────────── shared ──────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
