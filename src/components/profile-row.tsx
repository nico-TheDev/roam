import { ChevronRight } from "lucide-react-native";
import { Children } from "react";
import { Pressable, PressableProps, View } from "react-native";
import { cn } from "./cn";
import { Icon } from "./icon";
import { Surface } from "./surface";
import { Text } from "./text";

/** Row with its icon in a soft circle. `detail` replaces the chevron with muted text (for example "Coming soon"). */
export function ProfileRow({
  icon,
  label,
  detail,
  disabled,
  className,
  ...props
}: Omit<PressableProps, "children"> & { icon: React.ReactNode; label: string; detail?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      className={cn("h-16 flex-row items-center gap-4 px-2 active:bg-surface-alt", className)}
      {...props}
    >
      <View className={cn("size-11 items-center justify-center rounded-full bg-surface-alt", disabled && "opacity-60")}>
        {icon}
      </View>
      <Text variant="caption" className={cn("flex-1", disabled && "text-muted")}>
        {label}
      </Text>
      {detail ? (
        <Text variant="small" className="pr-2">
          {detail}
        </Text>
      ) : (
        <Icon icon={ChevronRight} className="text-ink" />
      )}
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

/** The design's grey panel: a title over a `ProfileList`. */
export function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Surface variant="flat" className="gap-3 p-2">
      <Text variant="title" className="px-3 pt-2">
        {title}
      </Text>
      <ProfileList>{children}</ProfileList>
    </Surface>
  );
}
