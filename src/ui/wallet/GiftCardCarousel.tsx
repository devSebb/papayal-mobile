import React, { useCallback, useEffect, useRef } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
  useWindowDimensions
} from "react-native";
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue
} from "react-native-reanimated";

import MerchantGiftCardHero from "../components/MerchantGiftCardHero";
import { theme } from "../theme";
import { GiftCard } from "../../types/api";
import { isCardHeld, senderShortName } from "../../domain/wallet/groupByMerchant";
import { hapticImpactLight } from "../../utils/haptics";

/**
 * The wallet's card presentation, shared by MerchantWalletScreen (a merchant's
 * whole stack) and GiftCardDetailScreen (one card, plus its siblings when it
 * has any). Both screens showed the same cards in visibly different ways
 * before this existed; keeping the markup in one place is what stops them
 * drifting apart again.
 *
 * Renders a single static hero when there is only one card — no snapping, no
 * dots — so a lone card doesn't look like a carousel that fails to scroll.
 */

/** One carousel page: the hero scaling/dimming as it leaves centre. */
const CarouselCard: React.FC<{
  card: GiftCard;
  merchantLabel: string;
  index: number;
  step: number;
  cardWidth: number;
  scrollX: SharedValue<number>;
}> = ({ card, merchantLabel, index, step, cardWidth, scrollX }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const position = scrollX.value / step;
    return {
      transform: [
        {
          scale: interpolate(
            position,
            [index - 1, index, index + 1],
            [0.94, 1, 0.94],
            Extrapolation.CLAMP
          )
        }
      ],
      opacity: interpolate(
        position,
        [index - 1, index, index + 1],
        [0.65, 1, 0.65],
        Extrapolation.CLAMP
      )
    };
  });

  return (
    <Animated.View style={[{ width: cardWidth }, animatedStyle]}>
      <MerchantGiftCardHero
        variant="owned"
        merchantName={merchantLabel}
        logoUrl={card.merchant_logo_url}
        remainingCents={card.remaining_balance_cents}
        originalCents={card.amount_cents}
        currency={card.currency}
        senderLabel={senderShortName(card)}
        held={isCardHeld(card)}
        style={{ width: cardWidth }}
      />
    </Animated.View>
  );
};

const Dot: React.FC<{
  index: number;
  step: number;
  scrollX: SharedValue<number>;
}> = ({ index, step, scrollX }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const position = scrollX.value / step;
    return {
      width: interpolate(position, [index - 1, index, index + 1], [8, 22, 8], Extrapolation.CLAMP),
      opacity: interpolate(
        position,
        [index - 1, index, index + 1],
        [0.35, 1, 0.35],
        Extrapolation.CLAMP
      )
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
};

type Props = {
  cards: GiftCard[];
  merchantLabel: string;
  /**
   * Which card starts centred. Opening a specific card from the wallet list
   * lands on that card rather than the merchant's first one.
   */
  initialIndex?: number;
  onActiveIndexChange?: (index: number) => void;
};

const GiftCardCarousel: React.FC<Props> = ({
  cards,
  merchantLabel,
  initialIndex = 0,
  onActiveIndexChange
}) => {
  const { width } = useWindowDimensions();

  const cardWidth = Math.round(width * 0.8);
  const cardGap = theme.spacing(1.5);
  const step = cardWidth + cardGap;
  const sidePadding = Math.max(0, (width - cardWidth) / 2);

  const startIndex = Math.max(0, Math.min(initialIndex, cards.length - 1));

  // Seeded so the initially-centred card renders at full scale/opacity on the
  // first frame instead of animating in from index 0.
  const scrollX = useSharedValue(startIndex * step);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const previousIndex = useRef(startIndex);

  /**
   * Siblings arrive from a separate query, so startIndex is often 0 on the
   * first render and only becomes the real index once the wallet list loads.
   * contentOffset alone would scroll the list without moving scrollX, leaving
   * the first card drawn as the focused one while a different card sits in the
   * centre. Re-seeding here (and remounting the list via its key below) keeps
   * the scroll position and the animation in agreement.
   */
  useEffect(() => {
    scrollX.value = startIndex * step;
    previousIndex.current = startIndex;
  }, [scrollX, startIndex, step]);

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / step);
      const next = Math.max(0, Math.min(index, cards.length - 1));
      if (next !== previousIndex.current) {
        previousIndex.current = next;
        hapticImpactLight();
      }
      onActiveIndexChange?.(next);
    },
    [step, cards.length, onActiveIndexChange]
  );

  if (cards.length === 0) return null;

  // A single card gets no scroll container at all: snapping and paging dots on
  // one item read as broken affordances.
  if (cards.length === 1) {
    return (
      <View style={styles.singleWrapper}>
        <MerchantGiftCardHero
          variant="owned"
          merchantName={merchantLabel}
          logoUrl={cards[0].merchant_logo_url}
          remainingCents={cards[0].remaining_balance_cents}
          originalCents={cards[0].amount_cents}
          currency={cards[0].currency}
          senderLabel={senderShortName(cards[0])}
          held={isCardHeld(cards[0])}
          style={{ width: cardWidth }}
        />
      </View>
    );
  }

  return (
    <>
      <Animated.FlatList
        // contentOffset only applies on mount, so a changed start index needs
        // a fresh list rather than a re-render of the existing one.
        key={`start-${startIndex}`}
        data={cards}
        keyExtractor={(card) => card.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        disableIntervalMomentum
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
        contentOffset={{ x: startIndex * step, y: 0 }}
        contentContainerStyle={{ paddingHorizontal: sidePadding }}
        ItemSeparatorComponent={() => <View style={{ width: cardGap }} />}
        renderItem={({ item, index }) => (
          <CarouselCard
            card={item}
            merchantLabel={merchantLabel}
            index={index}
            step={step}
            cardWidth={cardWidth}
            scrollX={scrollX}
          />
        )}
      />
      <View style={styles.dotsRow}>
        {cards.map((card, index) => (
          <Dot key={card.id} index={index} step={step} scrollX={scrollX} />
        ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  singleWrapper: {
    alignItems: "center"
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing(0.6),
    marginTop: theme.spacing(1.5)
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary
  }
});

export default GiftCardCarousel;
