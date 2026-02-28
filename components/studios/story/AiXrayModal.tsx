'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { AiXrayData } from '@/types';

interface AiXrayModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiXray: AiXrayData;
}

export function AiXrayModal({ isOpen, onClose, aiXray }: AiXrayModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-x-4 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-white p-6 pb-8 shadow-xl md:bottom-auto md:top-1/2 md:rounded-3xl md:-translate-y-1/2"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Drag handle (mobile) */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300 md:hidden" />

            <div className="text-center">
              <span className="text-4xl">🔍</span>
              <h3 className="mt-2 font-display text-xl font-bold text-gray-900">
                AI X-Ray: What Just Happened?
              </h3>
            </div>

            <p className="mt-4 text-center leading-relaxed text-gray-600">
              {aiXray.explanation}
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-brand-purple/10 px-3 py-1 text-sm font-medium text-brand-purple">
                {aiXray.concept}
              </span>
              <span className="rounded-full bg-brand-cyan/10 px-3 py-1 text-sm font-medium text-brand-cyan">
                {aiXray.model}
              </span>
              <span className="rounded-full bg-brand-orange/10 px-3 py-1 text-sm font-medium text-brand-orange">
                +{aiXray.aiPoints} AI Points
              </span>
            </div>

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-full bg-brand-purple py-3 text-center font-bold text-white transition-transform active:scale-95"
            >
              Got it!
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
