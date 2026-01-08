import { GiftCard } from "../../types/api";

export type TabKey = "all" | "received" | "sent" | "redeemed";

export type GiftCardVM = {
  id: GiftCard["id"];
  merchantLabel: string;
  amountCents?: number | null;
  remainingBalanceCents?: number | null;
  currency?: string;
  amountFormatted: string;
  originalFormatted: string;
  remainingFormatted: string;
  expiresAt?: string | null;
  status: "Active" | "Redeemed" | "Expired";
  rawStatus?: string;
  isExpired: boolean;
  isRedeemed: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  senderId?: string;
  recipientId?: string;
  redeemedDeltaCents?: number;
};

export type ActivityKind = "redeemed" | "expired" | "added" | "received" | "sent";

export type ActivityItem = {
  id: string;
  cardId: GiftCard["id"];
  title: string;
  subtitle?: string;
  timestamp?: string;
  sortValue: number;
  kind: ActivityKind;
  amountLabel?: string;
};

export type ClassifiedGiftCards = {
  all: GiftCardVM[];
  received: GiftCardVM[];
  sent: GiftCardVM[];
  redeemed: GiftCardVM[];
  hasSenderRecipientFields: boolean;
  canClassifyTransfers: boolean;
};

