import { ChevronRight } from "lucide-react-native";
import { Children } from "react";
import { Pressable, PressableProps, View } from "react-native";
import { cn } from "./cn";
import { Icon } from "./icon";
import { Surface } from "./surface";
import { Text } from "./text";

export function ProfileRow({
  icon,
  label,
  className,
  ...props
}: Omit<PressableProps, "children"> & { icon: React.ReactNode; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className={cn("h-14 flex-row items-center gap-4 px-2 active:bg-surface-alt", className)}
      {...props}
    >
      {icon}
      <Text variant="caption" className="flex-1">
        {label}
      </Text>
      <Icon icon={ChevronRight} className="text-ink" />
    </Pressable>
  );
}

/** Groups rows with hairlines between them. */
export function ProfileList({ children }: { children: React.ReactNode }) {
  const rows = Children.toArray(children);
  return (
    <Surface className="overflow-hidden p-1">
      {rows.map((row, i) => (
        <View key={i}>
          {i > 0 ? <View className="mx-2 h-px bg-border" /> : null}
          {row}
        </View>
      ))}
    </Surface>
  );
}
