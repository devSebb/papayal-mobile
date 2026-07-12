import { Merchant } from "../../types/api";

/** Fallback while the backend omits a custom label; matches
 *  Merchant::DEFAULT_REDEMPTION_PARTNER_LABEL on the API. */
export const DEFAULT_PARTNER_LABEL = "Medicity o Farmacias Económicas";

export type PartnerRedemption = {
  /** e.g. "Medicity o Farmacias Económicas" */
  label: string;
};

/**
 * Farmaenlace routing: cards for flagged merchants are paid at the partner
 * network's stores, not the merchant's own. Returns null for merchants that
 * redeem directly — callers render nothing in that case, so turning the flag
 * off in the admin removes every disclaimer without an app release.
 */
export const partnerRedemption = (
  merchant?: Pick<Merchant, "partner_redemption" | "redemption_partner_label"> | null
): PartnerRedemption | null => {
  if (!merchant?.partner_redemption) return null;

  return {
    label: merchant.redemption_partner_label?.trim() || DEFAULT_PARTNER_LABEL
  };
};
