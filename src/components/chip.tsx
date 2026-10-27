import { PressableProps } from "react-native";
import { cn } from "./cn";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

const variants = {
  /** Lavender when selected: the top filter row. */
  soft: { on: "bg-secondary", off: "bg-surface-alt" },
  /** Yellow when selected: the category row. */
  accent: { on: "bg-primary", off: "bg-surface-alt" },
} as const;

export function Chip({
  label,
  variant = "soft",
  selected,
  icon,
  className,
  ...props
}: Omit<PressableProps, "children"> & {
  label: string;
  variant?: keyof typeof variants;
  selected?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      className={cn(
        "h-11 flex-row items-center justify-center gap-2 rounded-full px-5",
        selected ? variants[variant].on : variants[variant].off,
        className,
      )}
      {...props}
    >
      {icon}
      <Text variant="caption">{label}</Text>
    </PressableScale>
  );
}
