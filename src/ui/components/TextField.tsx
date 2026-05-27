import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { theme } from "../theme";

type Props = TextInputProps & {
  label?: string;
  error?: string;
};

const TextField: React.FC<Props> = ({ label, error, style, multiline, ...rest }) => {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          multiline ? styles.multilineInput : null,
          error ? styles.inputError : null,
          style
        ]}
        multiline={multiline}
        placeholderTextColor={theme.colors.lightText}
        {...rest}
        returnKeyType={rest.returnKeyType ?? (multiline ? "default" : undefined)}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%"
  },
  label: {
    fontSize: theme.typography.small,
    color: theme.colors.muted,
    marginBottom: theme.spacing(0.5),
    fontFamily: theme.fonts.regular
  },
  input: {
    width: "100%",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(1.25),
    backgroundColor: theme.colors.card,
    fontSize: theme.typography.body,
    color: theme.colors.text,
    fontFamily: theme.fonts.light
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: "top"
  },
  inputError: {
    borderColor: theme.colors.danger
  },
  error: {
    color: theme.colors.danger,
    marginTop: theme.spacing(0.5),
    fontSize: theme.typography.small,
    fontFamily: theme.fonts.regular
  }
});

export default TextField;
