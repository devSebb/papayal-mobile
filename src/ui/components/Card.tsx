import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { theme } from "../theme";

const Card: React.FC<ViewProps> = ({ children, style, ...rest }) => {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 18,
    padding: theme.spacing(2),
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border
  }
});

export default Card;

