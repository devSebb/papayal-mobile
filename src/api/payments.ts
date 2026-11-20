import { PurchaseDraft } from "../domain/purchase/purchaseDraftStore";
import { CheckoutQuote, CheckoutTarget } from "../types/api";
import { translateCheckoutError } from "../utils/formErrors";
import { request, HttpError } from "./http";

export type PaymentIntentResponse = {
  clientSecret: string;
  paymentIntentId: string;
  /** Server price breakdown actually charged (subtotal + fee = total). */
  quote?: CheckoutQuote | null;
  /** Which card this load lands on and the balance it will reach (§8.3). */
  target?: CheckoutTarget | null;
  requestId?: string;
};

export type PaymentError = {
  type: "auth" | "validation" | "network" | "unknown";
  message: string;
  details?: unknown;
};

/**
 * Creates a PaymentIntent on the backend for gift card purchase.
 * Uses the draft_id for idempotency.
 */
export const createGiftCardPaymentIntent = async (
  draft: PurchaseDraft
): Promise<PaymentIntentResponse> => {
  if (!draft.merchant?.id) {
    throw createPaymentError("validation", "Falta seleccionar un comercio.");
  }
  if (!draft.amount_cents || draft.amount_cents <= 0) {
    throw createPaymentError("validation", "El monto debe ser mayor a cero.");
  }
  // Per-load min/max are enforced by the amount picker from config.limits
  // (§4.1) and by the backend (422 load_amount_out_of_range, translated
  // below). Not re-checked here against local constants: they would block
  // a cap raised in admin.
  // A self-reload has no recipient form to fill; the backend resolves the
  // buyer from the token (§8.3 `recipient.self`).
  if (!draft.recipient?.self && !draft.recipient?.email && !draft.recipient?.phone) {
    throw createPaymentError("validation", "El destinatario necesita email o teléfono.");
  }

  try {
    const { data, requestId } = await request<{
      client_secret: string;
      payment_intent_id: string;
      quote?: CheckoutQuote | null;
      target?: CheckoutTarget | null;
    }>("/api/v1/checkout/payment_intent", {
      method: "POST",
      body: {
        draft_id: draft.draft_id,
        merchant_id: draft.merchant.id,
        amount_cents: draft.amount_cents,
        currency: (draft.currency ?? "USD").toLowerCase(),
        recipient: draft.recipient?.self
          ? { self: true }
          : {
              name: draft.recipient?.name ?? "",
              email: draft.recipient?.email ?? "",
              phone: draft.recipient?.phone ?? "",
              note: draft.recipient?.note ?? ""
            }
      }
    });

    return {
      clientSecret: data.client_secret,
      paymentIntentId: data.payment_intent_id,
      quote: data.quote ?? null,
      target: data.target ?? null,
      requestId
    };
  } catch (err) {
    const httpError = err as HttpError;

    // Handle 401 - auth error
    if (httpError.status === 401) {
      throw createPaymentError(
        "auth",
        "Tu sesión expiró. Inicia sesión nuevamente.",
        httpError
      );
    }

    // Handle 422 - validation error from backend. The §4.1 cap codes
    // (`checkout.*`) carry `details.room_cents`; translateCapError turns them
    // into the Spanish copy from §4.4, falling back to the server message.
    if (httpError.status === 422) {
      const capMessage = translateCheckoutError(httpError.error?.code, httpError.error?.details);
      const backendMessage =
        capMessage ??
        httpError.error?.message ??
        "No se pudo procesar el pago. Verifica los datos e intenta nuevamente.";
      throw createPaymentError("validation", backendMessage, httpError);
    }

    // Handle network errors (status 0)
    if (httpError.status === 0 || httpError.error?.code === "network_error") {
      throw createPaymentError(
        "network",
        "Error de conexión. Verifica tu internet e intenta nuevamente.",
        httpError
      );
    }

    // Generic error
    throw createPaymentError(
      "unknown",
      "No se pudo procesar el pago. Intenta nuevamente.",
      httpError
    );
  }
};

function createPaymentError(
  type: PaymentError["type"],
  message: string,
  details?: unknown
): PaymentError {
  return { type, message, details };
}

export const isPaymentError = (err: unknown): err is PaymentError => {
  return (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    "message" in err &&
    ["auth", "validation", "network", "unknown"].includes((err as PaymentError).type)
  );
};

