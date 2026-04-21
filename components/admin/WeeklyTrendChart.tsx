'use client';

interface Props {
  data: { week: string; creations: number; students: number }[];
}

const WIDTH = 600;
const HEIGHT = 180;
const PADDING = { top: 20, right: 20, bottom: 30, left: 40 };

export function WeeklyTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
        No activity in the last 8 weeks yet.
      </div>
    );
  }

  const maxCreations = Math.max(1, ...data.map((d) => d.creations));
  const maxStudents = Math.max(1, ...data.map((d) => d.students));
  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;
  const step = innerW / Math.max(1, data.length - 1);

  const scale = (v: number, max: number) =>
    PADDING.top + innerH - (v / max) * innerH;

  const creationsPath = data
    .map((d, i) => {
      const x = PADDING.left + i * step;
      const y = scale(d.creations, maxCreations);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const studentsPath = data
    .map((d, i) => {
      const x = PADDING.left + i * step;
      const y = scale(d.students, maxStudents);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Last 8 weeks</h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-0.5 w-4 bg-purple-500" /> Creations
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-0.5 w-4 bg-emerald-500" /> Active students
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Horizontal gridlines */}
        {[0.25, 0.5, 0.75, 1].map((frac) => (
          <line
            key={frac}
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={PADDING.top + innerH * frac}
            y2={PADDING.top + innerH * frac}
            stroke="#F3F4F6"
          />
        ))}
        <path d={creationsPath} stroke="#7C3AED" strokeWidth={2} fill="none" />
        <path d={studentsPath} stroke="#10B981" strokeWidth={2} fill="none" />
        {data.map((d, i) => {
          const x = PADDING.left + i * step;
          return (
            <g key={d.week}>
              <circle
                cx={x}
                cy={scale(d.creations, maxCreations)}
                r={3}
                fill="#7C3AED"
              />
              <circle
                cx={x}
                cy={scale(d.students, maxStudents)}
                r={3}
                fill="#10B981"
              />
              <text
                x={x}
                y={HEIGHT - 10}
                textAnchor="middle"
                fontSize={9}
                fill="#9CA3AF"
              >
                {d.week.slice(-3)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
