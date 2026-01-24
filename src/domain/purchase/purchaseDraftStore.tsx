import React, { createContext, useContext, useMemo, useState } from "react";
import { generateUUID } from "../../utils/uuid";

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
  /** Unique ID for this draft, used for idempotency with backend */
  draft_id: string;
  merchant: MerchantSelection | null;
  amount_cents: number | null;
  currency: string;
  recipient: RecipientInfo | null;
};

type PurchaseDraftContextValue = {
  draft: PurchaseDraft;
  setMerchant: (merchant: MerchantSelection | null) => void;
  setAmount: (amountCents: number | null, currency?: string) => void;
  setRecipient: (recipient: RecipientInfo | null) => void;
  resetDraft: () => void;
};

const createInitialDraft = (): PurchaseDraft => ({
  draft_id: generateUUID(),
  merchant: null,
  amount_cents: null,
  currency: "USD",
  recipient: null
});

const PurchaseDraftContext = createContext<PurchaseDraftContextValue | undefined>(undefined);

export const PurchaseDraftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [draft, setDraft] = useState<PurchaseDraft>(createInitialDraft);

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

  /** Resets draft completely and generates a new draft_id for the next purchase */
  const resetDraft = () => setDraft(createInitialDraft());

  const value = useMemo<PurchaseDraftContextValue>(
    () => ({ draft, setMerchant, setAmount, setRecipient, resetDraft }),
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

