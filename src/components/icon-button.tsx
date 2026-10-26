import { Pressable, PressableProps } from "react-native";
import { cn } from "./cn";

const sizes = { md: "size-14", sm: "size-11" } as const;

export function IconButton({
  label,
  size = "md",
  selected,
  disabled,
  className,
  children,
  ...props
}: Omit<PressableProps, "children"> & {
  /** Required: icon-only controls have no text to read. */
  label: string;
  size?: keyof typeof sizes;
  selected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={disabled}
      className={cn(
        "items-center justify-center rounded-full bg-surface-alt active:opacity-70",
        selected && "bg-primary",
        disabled && "opacity-40",
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </Pressable>
  );
}
