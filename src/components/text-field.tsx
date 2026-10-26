import { useState } from "react";
import { Pressable, TextInput, TextInputProps, View } from "react-native";
import { cn } from "./cn";
import { Text } from "./text";

export function TextField({
  label,
  error,
  forceFocus,
  leading,
  trailing,
  className,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & {
  /** Accessibility label; the field itself shows only a placeholder. */
  label: string;
  error?: string;
  /** Shows the focused style without focusing, for the design-system page. */
  forceFocus?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const [focusedState, setFocused] = useState(false);
  const focused = focusedState || !!forceFocus;
  const [hidden, setHidden] = useState(!!props.secureTextEntry);
  const isPassword = !!props.secureTextEntry;
  return (
    <View className="gap-1">
      <View
        className={cn(
          "h-14 flex-row items-center gap-3 rounded-md border bg-surface-alt px-4",
          focused ? "border-secondary bg-secondary-soft" : "border-border",
          error && "border-danger",
          className,
        )}
        style={{ borderCurve: "continuous" }}
      >
        {leading}
        <TextInput
          accessibilityLabel={label}
          // TextInput needs a color value, not a class: mirrors --color-muted.
          placeholderTextColor="#6b7280"
          className="text-body flex-1 text-ink"
          {...props}
          secureTextEntry={isPassword && hidden}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            onPress={() => setHidden((h) => !h)}
          >
            {trailing}
          </Pressable>
        ) : (
          trailing
        )}
      </View>
      {error ? (
        <Text variant="caption" className="px-2 text-danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
