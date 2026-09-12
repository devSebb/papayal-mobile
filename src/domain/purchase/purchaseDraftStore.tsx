import React, { createContext, useContext, useMemo, useState } from "react";
import { generateUUID } from "../../utils/uuid";
import { CheckoutQuote, CheckoutTarget } from "../../types/api";

export type MerchantSelection = {
  id?: string;
  name?: string;
  logoUrl?: string | null;
};

/**
 * Who the load is for. `self: true` is the "Recargar mi tarjeta" path (§8.3):
 * the backend resolves the buyer from the token, so no contact fields are
 * collected and DeliveryProfile is skipped entirely.
 */
export type RecipientInfo = {
  self?: boolean;
  name?: string;
  email?: string;
  phone?: string;
  note?: string;
};

export type PurchaseDraft = {
  /** Unique ID for this draft, used for idempotency with backend */
  draft_id: string;
  merchant: MerchantSelection | null;
  amount_cents: number | null;
  currency: string;
  recipient: RecipientInfo | null;
  /** Server price breakdown (subtotal/fee/total). Cleared whenever the
   *  amount changes so a stale fee is never shown. */
  quote: CheckoutQuote | null;
  /** Where this payment landed (§8.3). Only known once the PaymentIntent has
   *  been created, so PurchaseSuccess reads it and the earlier screens don't. */
  target: CheckoutTarget | null;
};

type PurchaseDraftContextValue = {
  draft: PurchaseDraft;
  setMerchant: (merchant: MerchantSelection | null) => void;
  setAmount: (amountCents: number | null, currency?: string) => void;
  setRecipient: (recipient: RecipientInfo | null) => void;
  setQuote: (quote: CheckoutQuote | null) => void;
  setTarget: (target: CheckoutTarget | null) => void;
  resetDraft: () => void;
};

const createInitialDraft = (): PurchaseDraft => ({
  draft_id: generateUUID(),
  merchant: null,
  amount_cents: null,
  currency: "USD",
  recipient: null,
  quote: null,
  target: null
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
      currency: currency ?? prev.currency,
      // A different amount invalidates any previously fetched quote.
      quote: prev.amount_cents === amountCents ? prev.quote : null
    }));

  const setRecipient = (recipient: RecipientInfo | null) =>
    setDraft((prev) => ({ ...prev, recipient }));

  const setQuote = (quote: CheckoutQuote | null) =>
    setDraft((prev) => ({ ...prev, quote }));

  const setTarget = (target: CheckoutTarget | null) =>
    setDraft((prev) => ({ ...prev, target }));

  /** Resets draft completely and generates a new draft_id for the next purchase */
  const resetDraft = () => setDraft(createInitialDraft());

  const value = useMemo<PurchaseDraftContextValue>(
    () => ({ draft, setMerchant, setAmount, setRecipient, setQuote, setTarget, resetDraft }),
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

