'use client';

import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';

type ModalId = string;

interface ModalContextValue {
  openModal: (id: ModalId) => void;
  closeModal: (id: ModalId) => void;
  isOpen: (id: ModalId) => boolean;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [openModals, setOpenModals] = useState<Set<ModalId>>(new Set());

  const openModal = useCallback((id: ModalId) => {
    setOpenModals((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const closeModal = useCallback((id: ModalId) => {
    setOpenModals((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isOpen = useCallback(
    (id: ModalId) => openModals.has(id),
    [openModals],
  );

  return (
    <ModalContext.Provider value={{ openModal, closeModal, isOpen }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return ctx;
}
