import { translateCheckoutError } from "../src/utils/formErrors";

describe("translateCheckoutError", () => {
  it("says how much room is left on the card today (§4.1 card_daily_load_limit)", () => {
    expect(
      translateCheckoutError("checkout.card_daily_load_limit", {
        limit_cents: 40_000,
        used_cents: 37_000,
        room_cents: 3_000,
        resets_at: "2026-09-13T10:00:00Z"
      })
    ).toBe("Puedes recargar hasta $30.00 más hoy en esta tarjeta.");
  });

  it("never offers '$0.00 más' when the room is exactly zero", () => {
    expect(
      translateCheckoutError("checkout.card_daily_load_limit", {
        limit_cents: 40_000,
        used_cents: 40_000,
        room_cents: 0
      })
    ).toBe("Llegaste al límite de recargas de hoy en esta tarjeta. Inténtalo mañana.");
  });

  it("states the balance ceiling and the room under it", () => {
    expect(
      translateCheckoutError("checkout.card_balance_limit", {
        limit_cents: 50_000,
        used_cents: 45_000,
        room_cents: 5_000
      })
    ).toBe("Esta tarjeta puede tener hasta $500.00 de saldo. Puedes recargar $50.00.");
  });

  it("maps the per-load range from the server's own min/max", () => {
    expect(
      translateCheckoutError("checkout.load_amount_out_of_range", {
        min_cents: 500,
        max_cents: 20_000
      })
    ).toBe("El monto por recarga debe estar entre $5.00 y $200.00.");
  });

  it("explains the dispute block without naming a number (D4)", () => {
    expect(translateCheckoutError("checkout.buyer_dispute_open", {})).toBe(
      "Por seguridad, no puedes recargar mientras haya un pago en revisión."
    );
  });

  it("covers every §4.1 cap code", () => {
    const codes = [
      "checkout.load_amount_out_of_range",
      "checkout.card_daily_load_limit",
      "checkout.card_daily_count_limit",
      "checkout.card_balance_limit",
      "checkout.buyer_daily_limit",
      "checkout.buyer_daily_count_limit",
      "checkout.recipient_monthly_limit",
      "checkout.buyer_monthly_limit",
      "checkout.buyer_dispute_open"
    ];

    for (const code of codes) {
      expect(translateCheckoutError(code, { room_cents: 1_000 })).toEqual(expect.any(String));
    }
  });

  it("returns null for anything that is not a cap, so callers keep their copy", () => {
    expect(translateCheckoutError("kyc_incomplete", {})).toBeNull();
    expect(translateCheckoutError(undefined, {})).toBeNull();
  });

  it("survives a details payload that is missing or the wrong shape", () => {
    expect(translateCheckoutError("checkout.card_balance_limit", undefined)).toBe(
      "Esta tarjeta llegó a su saldo máximo."
    );
    expect(translateCheckoutError("checkout.buyer_daily_limit", "nope")).toBe(
      "Llegaste al límite de recargas de hoy. Inténtalo mañana."
    );
  });
});
