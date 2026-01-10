import { PurchaseDraft } from "../domain/purchase/purchaseDraftStore";

// TODO: Wire to backend PaymentIntent endpoint once available.
export const createGiftCardPaymentIntent = async (_draft: PurchaseDraft) => {
  throw new Error("NotImplementedError: backend endpoint missing");
};

