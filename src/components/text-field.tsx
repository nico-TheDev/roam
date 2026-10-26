import { Eye, EyeOff } from "lucide-react-native";
import { ComponentRef, Ref, useState } from "react";
import { Pressable, TextInput, TextInputProps, View } from "react-native";
import { cn } from "./cn";
import { Icon } from "./icon";
import { Text } from "./text";

export type TextFieldRef = ComponentRef<typeof TextInput>;

export function TextField({
  label,
  title,
  inputRef,
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
  /** Visible title shown above the value inside the box, as in the auth design. */
  title?: string;
  inputRef?: Ref<TextFieldRef>;
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
          "flex-row items-center gap-3 rounded-md border bg-surface-alt px-4",
          title ? "h-16" : "h-14",
          focused ? "border-secondary bg-secondary-soft" : "border-border",
          error && "border-danger",
          className,
        )}
        style={{ borderCurve: "continuous" }}
      >
        {leading}
        <View className="flex-1">
          {title ? <Text variant="caption">{title}</Text> : null}
          <TextInput
            ref={inputRef}
            accessibilityLabel={label}
            // TextInput needs a color value, not a class: mirrors --color-muted.
            placeholderTextColor="#6b7280"
            className="text-body text-ink"
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
        </View>
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            onPress={() => setHidden((h) => !h)}
          >
            {trailing ?? <Icon icon={hidden ? EyeOff : Eye} size="lg" />}
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
