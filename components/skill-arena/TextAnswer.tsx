'use client';

interface TextAnswerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  disabled?: boolean;
}

export function TextAnswer({
  value,
  onChange,
  placeholder = 'Type your answer here...',
  maxLength = 2000,
  rows = 5,
  disabled,
}: TextAnswerProps) {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        rows={rows}
        autoFocus
        disabled={disabled}
        className="w-full resize-none rounded-xl border-2 border-gray-200 p-4 text-sm text-gray-800 placeholder-gray-400 transition-colors focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100 disabled:opacity-50"
      />
      <div className="absolute bottom-3 right-3">
        <span
          className={`text-xs ${
            value.length > maxLength * 0.9 ? 'text-amber-500' : 'text-gray-400'
          }`}
        >
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}
