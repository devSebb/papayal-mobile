import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";

import { useBalanceCaptureDetector } from "../src/domain/wallet/useBalanceCaptureDetector";
import type { GiftCard } from "../src/types/api";

const card = (spendable: number, remaining = spendable): GiftCard => ({
  id: "1",
  merchant_id: "4",
  currency: "USD",
  status: "active",
  amount_cents: 10_000,
  remaining_balance_cents: remaining,
  spendable_cents: spendable,
  recipient_id: "30"
});

const Probe: React.FC<{
  card?: GiftCard;
  active: boolean;
  onCapture: (e: { deltaCents: number; remainingCents: number }) => void;
}> = ({ card: giftCard, active, onCapture }) => {
  useBalanceCaptureDetector(giftCard, active, onCapture);
  return <Text>probe</Text>;
};

describe("useBalanceCaptureDetector", () => {
  it("fires once when the merchant captures part of the spendable balance", () => {
    const onCapture = jest.fn();
    const { rerender } = render(
      <Probe card={card(4_000)} active onCapture={onCapture} />
    );
    expect(onCapture).not.toHaveBeenCalled();

    rerender(<Probe card={card(2_760)} active onCapture={onCapture} />);

    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(onCapture).toHaveBeenCalledWith({ deltaCents: 1_240, remainingCents: 2_760 });
  });

  it("watches spendable, so a hold landing on the card is not a capture", () => {
    const onCapture = jest.fn();
    // Spendable unchanged; only the held part of the total moved.
    const { rerender } = render(
      <Probe card={card(4_000, 7_000)} active onCapture={onCapture} />
    );
    rerender(<Probe card={card(4_000, 4_000)} active onCapture={onCapture} />);

    expect(onCapture).not.toHaveBeenCalled();
  });

  it("does not double-count a repeated poll of the same balance", () => {
    const onCapture = jest.fn();
    const { rerender } = render(
      <Probe card={card(4_000)} active onCapture={onCapture} />
    );
    rerender(<Probe card={card(1_000)} active onCapture={onCapture} />);
    rerender(<Probe card={card(1_000)} active onCapture={onCapture} />);

    expect(onCapture).toHaveBeenCalledTimes(1);
  });

  it("ignores a balance that went up (a reload landed mid-redemption)", () => {
    const onCapture = jest.fn();
    const { rerender } = render(
      <Probe card={card(4_000)} active onCapture={onCapture} />
    );
    rerender(<Probe card={card(7_000)} active onCapture={onCapture} />);

    expect(onCapture).not.toHaveBeenCalled();
  });

  it("detects nothing while inactive, and never replays that drop on resume", () => {
    const onCapture = jest.fn();
    const { rerender } = render(
      <Probe card={card(4_000)} active onCapture={onCapture} />
    );
    rerender(<Probe card={card(1_000)} active={false} onCapture={onCapture} />);
    expect(onCapture).not.toHaveBeenCalled();

    rerender(<Probe card={card(1_000)} active onCapture={onCapture} />);
    expect(onCapture).toHaveBeenCalledTimes(1);
  });

  it("falls back to the total when the serializer has no spendable (§11.4)", () => {
    const onCapture = jest.fn();
    const legacy = (remaining: number): GiftCard => ({
      id: "1",
      merchant_id: "4",
      currency: "USD",
      status: "active",
      amount_cents: 10_000,
      remaining_balance_cents: remaining,
      recipient_id: "30"
    });

    const { rerender } = render(<Probe card={legacy(5_000)} active onCapture={onCapture} />);
    rerender(<Probe card={legacy(2_000)} active onCapture={onCapture} />);

    expect(onCapture).toHaveBeenCalledWith({ deltaCents: 3_000, remainingCents: 2_000 });
  });
});
