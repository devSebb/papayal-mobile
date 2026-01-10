import React, { createContext, useContext, useMemo, useState } from "react";

export type MerchantSelection = {
  id?: string;
  name?: string;
  logoUrl?: string | null;
};

export type RecipientInfo = {
  name: string;
  email: string;
  phone: string;
  note?: string;
};

export type PurchaseDraft = {
  merchant: MerchantSelection | null;
  amount_cents: number | null;
  currency: string;
  recipient: RecipientInfo | null;
  isDemoPayment: boolean;
};

type PurchaseDraftContextValue = {
  draft: PurchaseDraft;
  setMerchant: (merchant: MerchantSelection | null) => void;
  setAmount: (amountCents: number | null, currency?: string) => void;
  setRecipient: (recipient: RecipientInfo | null) => void;
  setIsDemoPayment: (isDemo: boolean) => void;
  resetDraft: () => void;
};

const initialDraft: PurchaseDraft = {
  merchant: null,
  amount_cents: null,
  currency: "USD",
  recipient: null,
  isDemoPayment: true
};

const PurchaseDraftContext = createContext<PurchaseDraftContextValue | undefined>(undefined);

export const PurchaseDraftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [draft, setDraft] = useState<PurchaseDraft>(initialDraft);

  const setMerchant = (merchant: MerchantSelection | null) =>
    setDraft((prev) => ({ ...prev, merchant }));

  const setAmount = (amountCents: number | null, currency?: string) =>
    setDraft((prev) => ({
      ...prev,
      amount_cents: amountCents,
      currency: currency ?? prev.currency
    }));

  const setRecipient = (recipient: RecipientInfo | null) =>
    setDraft((prev) => ({ ...prev, recipient }));

  const setIsDemoPayment = (isDemo: boolean) =>
    setDraft((prev) => ({ ...prev, isDemoPayment: isDemo }));

  const resetDraft = () => setDraft(initialDraft);

  const value = useMemo<PurchaseDraftContextValue>(
    () => ({ draft, setMerchant, setAmount, setRecipient, setIsDemoPayment, resetDraft }),
    [draft]
  );

  return <PurchaseDraftContext.Provider value={value}>{children}</PurchaseDraftContext.Provider>;
};

export const usePurchaseDraft = () => {
  const ctx = useContext(PurchaseDraftContext);
  if (!ctx) {
    throw new Error("usePurchaseDraft must be used within PurchaseDraftProvider");
  }
  return ctx;
};

