/**
 * Typography uses static Raleway files from @expo-google-fonts/raleway.
 * Use explicit theme.fonts.* entries instead of fontWeight so weights render correctly on iOS/Android.
 */
export const theme = {
  colors: {
    primary: "#FCA50F",
    secondary: "#0D2F32",
    background: "#FDF1E1",
    lightText: "#545353",
    card: "#FFFFFF",
    text: "#2C3A43",
    muted: "#6A7780",
    border: "#D7DBD9",
    navbar: "#0D2F32",
    navbarMuted: "#6A848A",
    success: "#39B66E",
    danger: "#E15555"
  },
  spacing: (multiplier = 1) => 8 * multiplier,
  radius: {
    sm: 8,
    md: 12,
    lg: 16
  },
  fonts: {
    thin: "Raleway_100Thin",
    extraLight: "Raleway_200ExtraLight",
    light: "Raleway_300Light",
    regular: "Raleway_400Regular",
    medium: "Raleway_500Medium",
    semiBold: "Raleway_600SemiBold",
    bold: "Raleway_700Bold",
    extraBold: "Raleway_800ExtraBold",
    black: "Raleway_900Black",
    italic: "Raleway_400Regular_Italic",
    italicMedium: "Raleway_500Medium_Italic",
    italicSemiBold: "Raleway_600SemiBold_Italic",
    italicBold: "Raleway_700Bold_Italic",
    /** UI emphasis — same as bold */
    brand: "Raleway_700Bold",
    /** Papayal wordmark — always Raleway Black */
    brandBlack: "Raleway_900Black"
  },
  typography: {
    heading: 24,
    subheading: 20,
    body: 18,
    small: 14
  }
};
