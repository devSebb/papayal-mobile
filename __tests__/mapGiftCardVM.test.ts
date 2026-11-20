import { mapGiftCardVM } from "../src/domain/wallet/mapGiftCardVM";
import type { GiftCard } from "../src/types/api";

const NOW = new Date("2026-09-12T10:00:00Z");
const FUTURE = "2026-09-13T10:00:00Z";

const card = (overrides: Partial<GiftCard> = {}): GiftCard => ({
  id: "1",
  merchant_id: "4",
  merchant_store_name: "Farmacias Económicas",
  currency: "USD",
  status: "active",
  amount_cents: 12_000,
  remaining_balance_cents: 7_000,
  spendable_cents: 4_000,
  held_cents: 3_000,
  disputed_cents: 0,
  total_loaded_cents: 12_000,
  loads_count: 3,
  recipient_id: "30",
  ...overrides
});

describe("mapGiftCardVM", () => {
  it("uses spendable_cents as the available balance, not the total", () => {
    const vm = mapGiftCardVM(card(), NOW);

    expect(vm.availableCents).toBe(4_000);
    expect(vm.availableFormatted).toBe("$40.00");
    expect(vm.remainingBalanceCents).toBe(7_000);
    expect(vm.heldCents).toBe(3_000);
    expect(vm.isHeld).toBe(true);
    expect(vm.canRedeem).toBe(true);
  });

  it("keeps the rest of the balance spendable while one load is disputed (D4)", () => {
    const vm = mapGiftCardVM(
      card({ spendable_cents: 4_000, held_cents: 0, disputed_cents: 3_000 }),
      NOW
    );

    expect(vm.hasDispute).toBe(true);
    expect(vm.disputedFormatted).toBe("$30.00");
    expect(vm.availableCents).toBe(4_000);
    expect(vm.canRedeem).toBe(true);
  });

  it("blocks redemption on an admin-frozen card (D3)", () => {
    const vm = mapGiftCardVM(
      card({ status: "frozen", spendable_cents: 0, frozen_reason: "Revisión de seguridad." }),
      NOW
    );

    expect(vm.isFrozen).toBe(true);
    expect(vm.canRedeem).toBe(false);
    expect(vm.frozenReason).toBe("Revisión de seguridad.");
  });

  it("treats a zero balance as 'sin saldo', never as a redeemed card (D3)", () => {
    const vm = mapGiftCardVM(
      card({ remaining_balance_cents: 0, spendable_cents: 0, held_cents: 0 }),
      NOW
    );

    expect(vm.isEmpty).toBe(true);
    expect(vm.canRedeem).toBe(false);
    expect(vm.rawStatus).toBe("active");
  });

  it("falls back to the pre-reloadable serializer for one release (§11.4)", () => {
    const legacy = mapGiftCardVM(
      {
        id: "9",
        merchant_id: "4",
        merchant_store_name: "Medicity",
        currency: "USD",
        status: "active",
        amount_cents: 5_000,
        remaining_balance_cents: 5_000,
        recipient_id: "30"
      },
      NOW
    );

    expect(legacy.availableCents).toBe(5_000);
    expect(legacy.totalLoadedCents).toBe(5_000);
    expect(legacy.loadsCount).toBe(1);
    expect(legacy.canRedeem).toBe(true);
  });

  it("treats an old card-wide hold as the whole balance being held (§11.4)", () => {
    const legacy = mapGiftCardVM(
      {
        id: "9",
        merchant_id: "4",
        merchant_store_name: "Medicity",
        currency: "USD",
        status: "active",
        amount_cents: 5_000,
        remaining_balance_cents: 5_000,
        held_until: FUTURE,
        recipient_id: "30"
      },
      NOW
    );

    expect(legacy.availableCents).toBe(0);
    expect(legacy.heldCents).toBe(5_000);
    expect(legacy.canRedeem).toBe(false);
  });
});
