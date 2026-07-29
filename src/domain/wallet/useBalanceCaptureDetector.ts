import { useEffect, useRef } from "react";

import type { GiftCard } from "../../types/api";

/** How often to re-check a card's balance while a redemption code is on screen. */
export const BALANCE_POLL_MS = 4000;

export type BalanceCaptureEvent = {
  /** How much the balance dropped since the last observation, in cents. */
  deltaCents: number;
  /** The card's new remaining balance, in cents (0 means fully redeemed). */
  remainingCents: number;
};

/**
 * Turns a gift card's polled balance into "the merchant just captured a
 * payment" events. The card itself is refetched on an interval by the caller
 * (see BALANCE_POLL_MS); this hook only compares each observed balance against
 * a per-card baseline and fires `onCapture` once per drop — so a late poll
 * response or a re-render with an unchanged balance can never double-count.
 * Observing an equal or higher balance is a no-op.
 *
 * `active` gates detection (e.g. only while a code is actually on screen).
 * When it flips off the baseline is retained, so resuming never mistakes an
 * already-counted drop for a fresh capture.
 */
export function useBalanceCaptureDetector(
  card: GiftCard | undefined,
  active: boolean,
  onCapture: (event: BalanceCaptureEvent) => void
) {
  const baselines = useRef(new Map<string, number>());
  // Hold the latest callback in a ref so passing an inline closure from the
  // screen doesn't retrigger the detection effect on every render.
  const onCaptureRef = useRef(onCapture);
  useEffect(() => {
    onCaptureRef.current = onCapture;
  });

  useEffect(() => {
    if (!card || !active) return;

    const baseline = baselines.current.get(card.id);
    if (baseline === undefined) {
      baselines.current.set(card.id, card.remaining_balance_cents);
      return;
    }

    const remaining = card.remaining_balance_cents;
    if (remaining >= baseline) return;

    const delta = baseline - remaining;
    baselines.current.set(card.id, remaining);
    onCaptureRef.current({ deltaCents: delta, remainingCents: remaining });
  }, [card, active]);
}
