import { ActivityIndicator, Pressable, PressableProps, View } from "react-native";
import { cn } from "./cn";
import { Text } from "./text";

const variants = {
  primary: "bg-primary active:opacity-80",
  secondary: "bg-surface border border-border active:bg-surface-alt",
  danger: "bg-danger-soft active:opacity-80",
} as const;

const sizes = {
  md: "h-14 px-6",
  sm: "h-11 px-4",
} as const;

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  icon,
  trailing,
  className,
  ...props
}: Omit<PressableProps, "children"> & {
  title: string;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  /** Leading node, e.g. a brand logo. */
  icon?: React.ReactNode;
  /** Trailing node, e.g. an arrow. */
  trailing?: React.ReactNode;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      className={cn(
        "flex-row items-center justify-center gap-3 rounded-full",
        variants[variant],
        sizes[size],
        disabled && "opacity-40",
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          {icon}
          <Text variant="button" className="flex-shrink">
            {title}
          </Text>
          {trailing ? <View className="absolute right-6">{trailing}</View> : null}
        </>
      )}
    </Pressable>
  );
}
