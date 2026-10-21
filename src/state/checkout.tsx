import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PaymentMethod } from './orders';
import { readJSON, writeJSON } from './storage';

const KEY = 'iris.checkout.v1';

export interface CheckoutDraft {
  contact: { name: string; phone: string; email: string; whatsapp: boolean };
  delivery: { governorate: string; district: string; neighborhood: string; landmark: string; details: string; notes: string };
  payment: PaymentMethod;
  acceptTerms: boolean;
}

export const GOVERNORATES = [
  { value: 'بغداد', label: 'بغداد (العاصمة)' },
  { value: 'أربيل', label: 'أربيل' },
  { value: 'البصرة', label: 'البصرة' },
  { value: 'النجف الأشرف', label: 'النجف الأشرف' },
  { value: 'السليمانية', label: 'السليمانية' },
  { value: 'نينوى', label: 'نينوى' },
  { value: 'كربلاء', label: 'كربلاء المقدسة' },
  { value: 'كركوك', label: 'كركوك' },
];

const EMPTY: CheckoutDraft = {
  contact: { name: '', phone: '', email: '', whatsapp: true },
  delivery: { governorate: 'بغداد', district: '', neighborhood: '', landmark: '', details: '', notes: '' },
  payment: 'cod',
  acceptTerms: true,
};

interface CheckoutContextValue {
  draft: CheckoutDraft;
  setContact: (patch: Partial<CheckoutDraft['contact']>) => void;
  setDelivery: (patch: Partial<CheckoutDraft['delivery']>) => void;
  setPayment: (m: PaymentMethod) => void;
  setAcceptTerms: (v: boolean) => void;
  reset: () => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<CheckoutDraft>(() => ({ ...EMPTY, ...readJSON<Partial<CheckoutDraft>>(KEY, {}) }));
  useEffect(() => writeJSON(KEY, draft), [draft]);

  const setContact = useCallback((patch: Partial<CheckoutDraft['contact']>) => setDraft((d) => ({ ...d, contact: { ...d.contact, ...patch } })), []);
  const setDelivery = useCallback((patch: Partial<CheckoutDraft['delivery']>) => setDraft((d) => ({ ...d, delivery: { ...d.delivery, ...patch } })), []);
  const setPayment = useCallback((payment: PaymentMethod) => setDraft((d) => ({ ...d, payment })), []);
  const setAcceptTerms = useCallback((acceptTerms: boolean) => setDraft((d) => ({ ...d, acceptTerms })), []);
  const reset = useCallback(() => setDraft(EMPTY), []);

  const value = useMemo(() => ({ draft, setContact, setDelivery, setPayment, setAcceptTerms, reset }), [draft, setContact, setDelivery, setPayment, setAcceptTerms, reset]);
  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout(): CheckoutContextValue {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error('useCheckout must be used inside <CheckoutProvider>');
  return ctx;
}

/** تحقق بسيط من رقم هاتف عراقي (07XXXXXXXXX). */
export function isValidIraqiPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  return /^(964)?0?7\d{9}$/.test(digits) || /^07\d{9}$/.test(digits);
}
