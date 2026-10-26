import { ComponentRef, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { cn } from "./cn";
import { Text } from "./text";

/** One-time code entry: visible boxes over a single hidden input, so paste and SMS autofill work. */
export function CodeInput({
  value,
  onChange,
  length = 6,
  error,
  autoFocus,
}: {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  error?: boolean;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, length - 1);

  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessible={false}>
      <View className="flex-row gap-2" pointerEvents="none">
        {Array.from({ length }, (_, i) => (
          <View
            key={i}
            className={cn(
              "h-16 flex-1 items-center justify-center rounded-md border bg-surface-alt",
              focused && i === active ? "border-secondary bg-secondary-soft" : "border-border",
              error && "border-danger",
            )}
            style={{ borderCurve: "continuous" }}
          >
            <Text variant="heading">{value[i] ?? ""}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        accessibilityLabel="Verification code"
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus={autoFocus}
        caretHidden
        className="absolute inset-0 opacity-0"
      />
    </Pressable>
  );
}
