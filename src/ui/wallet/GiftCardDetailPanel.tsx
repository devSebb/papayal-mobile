import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import Banner from "../components/Banner";
import { theme } from "../theme";
import { GiftCard } from "../../types/api";
import { isCardHeld } from "../../domain/wallet/groupByMerchant";
import { getInitials } from "../../utils/initials";

const avatarPlaceholder = require("../../../assets/avatar-default.png");

const HOLD_UNLOCK_FORMATTER = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const RECEIVED_DATE_FORMATTER = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "long",
  year: "numeric"
});

const formatReceivedDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return RECEIVED_DATE_FORMATTER.format(new Date(parsed));
};

const senderFullName = (card: GiftCard) =>
  card.sender?.full_name?.trim() ||
  [card.sender?.name, card.sender?.last_name].filter(Boolean).join(" ").trim() ||
  card.sender?.name?.trim() ||
  null;

type Props = {
  card: GiftCard;
  /** Hidden for cards the user sent — the sender is them. */
  showSender?: boolean;
  /**
   * Actions for this card. Rendered last, and replaced by the hold banner
   * while the card is under a security hold, since nothing is actionable then.
   */
  children?: React.ReactNode;
};

/**
 * The panel under the card hero: who sent it, their note, and the card's
 * actions. Shared so MerchantWalletScreen and GiftCardDetailScreen present an
 * identical card, differing only in which actions they pass as children.
 */
const GiftCardDetailPanel: React.FC<Props> = ({ card, showSender = true, children }) => {
  const senderName = senderFullName(card);
  const receivedDate = formatReceivedDate(card.created_at);
  const held = isCardHeld(card);
  const heldUntilDate = held && card.held_until ? new Date(card.held_until) : null;
  const hasNote = Boolean(card.note?.trim());

  return (
    <Animated.View key={card.id} entering={FadeIn.duration(220)} style={styles.detailPanel}>
      {showSender && senderName ? (
        <View style={styles.senderRow}>
          <View style={styles.senderAvatarWrapper}>
            {card.sender?.avatar_url ? (
              <Image source={{ uri: card.sender.avatar_url }} style={styles.senderAvatar} />
            ) : (
              <>
                <Image source={avatarPlaceholder} style={styles.senderAvatar} />
                <Text style={styles.senderInitials}>{getInitials(senderName)}</Text>
              </>
            )}
          </View>
          <View style={styles.senderInfo}>
            <Text style={styles.senderName}>{senderName}</Text>
            {receivedDate ? <Text style={styles.senderMeta}>Recibida el {receivedDate}</Text> : null}
          </View>
        </View>
      ) : null}

      {hasNote ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>{card.note}</Text>
        </View>
      ) : null}

      {heldUntilDate ? (
        <Banner
          icon="lock"
          tone="warning"
          title="Verificación de seguridad"
          message={`Esta tarjeta estará disponible para canje el ${HOLD_UNLOCK_FORMATTER.format(
            heldUntilDate
          )}.`}
        />
      ) : (
        children
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  detailPanel: {
    marginTop: theme.spacing(2),
    marginHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.card,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.cardBorder,
    padding: theme.spacing(2),
    gap: theme.spacing(1.5),
    ...theme.shadow.sm
  },
  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1.5)
  },
  senderAvatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  senderAvatar: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  senderInitials: {
    position: "absolute",
    color: theme.colors.secondary,
    fontFamily: theme.fonts.bold,
    fontSize: theme.typography.body
  },
  senderInfo: {
    flex: 1,
    gap: theme.spacing(0.25)
  },
  senderName: {
    fontSize: theme.typography.body,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text
  },
  senderMeta: {
    fontSize: theme.typography.small,
    color: theme.colors.muted
  },
  noteBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    padding: theme.spacing(1.5)
  },
  noteText: {
    fontSize: theme.typography.body,
    color: theme.colors.text,
    fontFamily: theme.fonts.italic,
    lineHeight: 24
  }
});

export default GiftCardDetailPanel;
