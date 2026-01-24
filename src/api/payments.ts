import { PurchaseDraft } from "../domain/purchase/purchaseDraftStore";
import { request, HttpError } from "./http";

export type PaymentIntentResponse = {
  clientSecret: string;
  paymentIntentId: string;
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
  if (!draft.recipient?.email && !draft.recipient?.phone) {
    throw createPaymentError("validation", "El destinatario necesita email o teléfono.");
  }

  try {
    const { data, requestId } = await request<{
      client_secret: string;
      payment_intent_id: string;
    }>("/api/v1/checkout/payment_intent", {
      method: "POST",
      body: {
        draft_id: draft.draft_id,
        merchant_id: draft.merchant.id,
        amount_cents: draft.amount_cents,
        currency: (draft.currency ?? "USD").toLowerCase(),
        recipient: {
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

    // Handle 422 - validation error from backend
    if (httpError.status === 422) {
      const backendMessage =
        httpError.error?.message ??
        httpError.error?.details?.toString() ??
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

