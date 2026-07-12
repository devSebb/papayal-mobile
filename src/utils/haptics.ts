import * as Haptics from "expo-haptics";

// Fire-and-forget haptic helpers. expo-haptics can throw synchronously or
// reject on some devices/simulators; feedback must never break a flow, so
// every helper swallows failures silently.
const fireAndForget = (trigger: () => Promise<void>) => {
  try {
    trigger().catch(() => {});
  } catch {
    // ignore: haptics are best-effort
  }
};

export const hapticSelection = () => {
  fireAndForget(() => Haptics.selectionAsync());
};

export const hapticImpactLight = () => {
  fireAndForget(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
};

export const hapticSuccess = () => {
  fireAndForget(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
};

export const hapticWarning = () => {
  fireAndForget(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
};
