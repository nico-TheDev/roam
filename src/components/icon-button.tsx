import { PressableProps } from "react-native";
import { cn } from "./cn";
import { PressableScale } from "./pressable-scale";

// `tall` is the pill-shaped search button beside the home headline.
const sizes = { md: "size-14", sm: "size-11", tall: "h-21 w-15" } as const;
const variants = { soft: "bg-surface-alt", outline: "border border-border bg-surface" } as const;

export function IconButton({
  label,
  size = "md",
  variant = "soft",
  selected,
  disabled,
  className,
  children,
  ...props
}: Omit<PressableProps, "children"> & {
  /** Required: icon-only controls have no text to read. */
  label: string;
  size?: keyof typeof sizes;
  variant?: keyof typeof variants;
  selected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={disabled}
      className={cn(
        "items-center justify-center rounded-full",
        variants[variant],
        selected && "bg-primary",
        disabled && "opacity-40",
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </PressableScale>
  );
}
