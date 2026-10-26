import { View, ViewProps } from "react-native";
import { cn } from "./cn";

const variants = {
  card: "bg-surface rounded-lg shadow-card",
  field: "bg-surface-alt rounded-md",
  flat: "bg-surface-alt rounded-lg",
} as const;

export function Surface({
  variant = "card",
  className,
  style,
  ...props
}: ViewProps & { variant?: keyof typeof variants }) {
  return (
    <View
      className={cn("p-4", variants[variant], className)}
      style={[{ borderCurve: "continuous" }, style]}
      {...props}
    />
  );
}
