import { View, ViewProps } from "react-native";
import { cn } from "./cn";
import { Text } from "./text";

const tones = {
  highlight: "bg-highlight-soft",
  success: "bg-success-soft",
  danger: "bg-danger-soft",
  info: "bg-info-soft",
  neutral: "bg-surface-alt",
} as const;

const sizes = {
  xs: "h-7 px-2.5 gap-1",
  md: "h-10 px-4 gap-2",
  sm: "h-8 px-3 gap-1.5",
} as const;

export function Badge({
  label,
  tone = "highlight",
  size = "md",
  icon,
  className,
  ...props
}: ViewProps & {
  label: string;
  tone?: keyof typeof tones;
  size?: keyof typeof sizes;
  icon?: React.ReactNode;
}) {
  return (
    <View
      className={cn(
        "flex-row items-center self-start rounded-full",
        sizes[size],
        tones[tone],
        className,
      )}
      {...props}
    >
      {icon}
      <Text variant={size === "xs" ? "micro" : size === "sm" ? "small" : "caption"} className="text-ink">
        {label}
      </Text>
    </View>
  );
}
