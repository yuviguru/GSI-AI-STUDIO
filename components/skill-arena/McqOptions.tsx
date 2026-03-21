'use client';

import { motion } from 'framer-motion';

interface McqOptionsProps {
  options: string[];
  selected: string | null;
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export function McqOptions({ options, selected, onSelect, disabled }: McqOptionsProps) {
  return (
    <div className="space-y-2">
      {options.map((option, i) => {
        const isSelected = selected === option;
        return (
          <motion.button
            key={option}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(option)}
            disabled={disabled}
            className={`w-full rounded-xl border-2 p-3 text-left text-sm transition-all ${
              isSelected
                ? 'border-purple-400 bg-purple-50 font-medium text-purple-800'
                : 'border-gray-200 bg-white text-gray-700 hover:border-purple-200 hover:bg-purple-50/50'
            } disabled:opacity-50`}
          >
            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold">
              {String.fromCharCode(65 + i)}
            </span>
            {option}
          </motion.button>
        );
      })}
    </div>
  );
}
