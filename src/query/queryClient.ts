import { AppState } from "react-native";
import { focusManager, QueryClient } from "@tanstack/react-query";

// React Query only tracks web window focus; map RN app foregrounding to it so
// refetchOnWindowFocus fires when the user returns to the app. Module-level
// subscription lives for the app's lifetime alongside the singleton client.
AppState.addEventListener("change", (state) => {
  focusManager.setFocused(state === "active");
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true
    }
  }
});
