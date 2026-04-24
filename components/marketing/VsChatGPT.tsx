import { Check, X } from 'lucide-react';

interface Row {
  feature: string;
  chatgpt: boolean | string;
  gsi: boolean | string;
  detail?: string;
}

const ROWS: Row[] = [
  { feature: 'Built for kids ages 8–17', chatgpt: false, gsi: true },
  { feature: 'Multi-layer child-safety filter', chatgpt: false, gsi: true, detail: 'Input + output + report loop' },
  { feature: 'Teaches how the AI works (lesson with each output)', chatgpt: false, gsi: true, detail: 'AI X-Ray' },
  { feature: 'Mapped to CBSE AI & CT curriculum', chatgpt: false, gsi: '24 concepts' },
  { feature: 'One-tap shareable creations (WhatsApp, link)', chatgpt: false, gsi: true },
  { feature: 'Weekly parent progress reports', chatgpt: false, gsi: true },
  { feature: 'Data stored in India (DPDPA-ready)', chatgpt: false, gsi: true },
  { feature: 'Prompts/outputs used to train AI', chatgpt: 'Yes, by default', gsi: 'Never' },
  { feature: 'Cost', chatgpt: '₹1,999/mo', gsi: '₹299/mo Pro · free tier' },
];

function renderCell(value: boolean | string, tone: 'neg' | 'pos') {
  if (value === true) {
    return (
      <span className={`inline-flex items-center gap-2 ${tone === 'pos' ? 'text-brand-secondary' : 'text-brand-text-muted'}`}>
        <Check className="h-4 w-4" />
        <span className="sr-only">Yes</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className={`inline-flex items-center gap-2 ${tone === 'neg' ? 'text-brand-error' : 'text-brand-text-muted'}`}>
        <X className="h-4 w-4" />
        <span className="sr-only">No</span>
      </span>
    );
  }
  return (
    <span className={`text-caption font-semibold ${tone === 'pos' ? 'text-brand-secondary' : 'text-brand-text-secondary'}`}>
      {value}
    </span>
  );
}

export function VsChatGPT() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-5 sm:px-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-caption font-semibold uppercase tracking-wide text-brand-primary">
            The honest comparison
          </p>
          <h2 className="mt-3 font-display text-[32px] font-extrabold leading-tight tracking-tight text-brand-text text-balance sm:text-[44px]">
            GSI vs. ChatGPT: built for different people.
          </h2>
          <p className="mt-4 text-body-lg leading-relaxed text-brand-text-secondary">
            ChatGPT is a tool for adults. GSI is a learning platform for your
            child. Here&apos;s the difference, laid out side by side.
          </p>
        </div>

        {/* Table */}
        <div className="mt-12 overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-brand-border/60">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_110px_140px] items-center gap-4 bg-brand-background px-5 py-4 sm:grid-cols-[1fr_140px_180px] sm:px-7">
            <div className="text-caption font-bold uppercase tracking-wide text-brand-text-muted">
              Feature
            </div>
            <div className="text-center font-display text-sm font-bold text-brand-text-secondary">
              ChatGPT
            </div>
            <div className="rounded-xl bg-gradient-to-br from-brand-primary to-brand-ai px-3 py-1.5 text-center font-display text-sm font-bold text-white">
              GSI AI Studio
            </div>
          </div>

          {/* Rows */}
          {ROWS.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-[1fr_110px_140px] items-center gap-4 px-5 py-4 sm:grid-cols-[1fr_140px_180px] sm:px-7 ${
                i > 0 ? 'border-t border-brand-border' : ''
              } ${i % 2 === 1 ? 'bg-brand-background/40' : ''}`}
            >
              <div>
                <div className="font-display text-caption font-semibold text-brand-text sm:text-body">
                  {row.feature}
                </div>
                {row.detail && (
                  <div className="mt-0.5 text-[11px] text-brand-text-muted">
                    {row.detail}
                  </div>
                )}
              </div>
              <div className="flex justify-center">
                {renderCell(row.chatgpt, 'neg')}
              </div>
              <div className="flex justify-center">
                {renderCell(row.gsi, 'pos')}
              </div>
            </div>
          ))}
        </div>

        {/* Footnote */}
        <p className="mt-6 text-center text-caption text-brand-text-muted">
          We respect ChatGPT — it&apos;s a remarkable tool. It&apos;s just not
          built for a 10-year-old with a school syllabus and a parent who wants
          to know what happened on the screen.
        </p>
      </div>
    </section>
  );
}
