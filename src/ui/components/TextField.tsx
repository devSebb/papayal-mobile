import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { theme } from "../theme";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  secureToggle?: boolean;
};

const TextField: React.FC<Props> = ({
  label,
  error,
  style,
  multiline,
  secureTextEntry,
  secureToggle = false,
  ...rest
}) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const showToggle = Boolean(secureToggle && secureTextEntry);
  const resolvedSecureTextEntry = showToggle ? !passwordVisible : secureTextEntry;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        <TextInput
          style={[
            styles.input,
            showToggle ? styles.inputWithToggle : null,
            multiline ? styles.multilineInput : null,
            error ? styles.inputError : null,
            style
          ]}
          multiline={multiline}
          secureTextEntry={resolvedSecureTextEntry}
          placeholderTextColor={theme.colors.lightText}
          {...rest}
          returnKeyType={rest.returnKeyType ?? (multiline ? "default" : undefined)}
        />
        {showToggle ? (
          <Pressable
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.secureToggle}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            <Feather
              name={passwordVisible ? "eye-off" : "eye"}
              size={20}
              color={theme.colors.muted}
            />
          </Pressable>
        ) : null}
      </View>
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
  inputWrap: {
    position: "relative",
    width: "100%"
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
  inputWithToggle: {
    paddingRight: theme.spacing(5.5)
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
  },
  secureToggle: {
    position: "absolute",
    right: theme.spacing(1),
    top: 0,
    bottom: 0,
    width: 36,
    alignItems: "center",
    justifyContent: "center"
  }
});

export default TextField;
