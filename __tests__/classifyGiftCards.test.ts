import { classifyGiftCards } from "../src/domain/wallet/classifyGiftCards";
import { mapGiftCardVM } from "../src/domain/wallet/mapGiftCardVM";
import type { GiftCard } from "../src/types/api";

const card = (id: string, recipientId: string): GiftCard => ({
  id,
  merchant_id: "4",
  merchant_store_name: "Farmacias Económicas",
  currency: "USD",
  status: "active",
  amount_cents: 3_000,
  remaining_balance_cents: 3_000,
  spendable_cents: 3_000,
  recipient_id: recipientId
});

const vms = (cards: GiftCard[]) => cards.map((c) => mapGiftCardVM(c));

describe("classifyGiftCards", () => {
  it("keeps only the cards this account holds", () => {
    const result = classifyGiftCards(vms([card("1", "30"), card("2", "31")]), "30");

    expect(result.canClassify).toBe(true);
    expect(result.cards.map((c) => c.id)).toEqual(["1"]);
  });

  it("classifies nothing until the account id is known", () => {
    const result = classifyGiftCards(vms([card("1", "30")]), undefined);

    expect(result.canClassify).toBe(false);
    expect(result.cards).toEqual([]);
  });

  it("returns cards with no balance too — they are still the user's (D3)", () => {
    const empty = mapGiftCardVM({
      ...card("3", "30"),
      remaining_balance_cents: 0,
      spendable_cents: 0
    });

    const result = classifyGiftCards([empty], "30");

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].isEmpty).toBe(true);
  });
});
