import { ChevronRight } from "lucide-react-native";
import { Pressable, PressableProps, View } from "react-native";
import { cn } from "./cn";
import { Icon } from "./icon";
import { Text } from "./text";

export function PolicyCard({
  icon,
  title,
  description,
  className,
  ...props
}: Omit<PressableProps, "children"> & {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      className={cn("flex-row items-center gap-3 rounded-md bg-secondary-soft p-3 active:opacity-70", className)}
      style={{ borderCurve: "continuous" }}
      {...props}
    >
      <View className="size-14 items-center justify-center rounded-sm bg-secondary/50">{icon}</View>
      <View className="flex-1 gap-1">
        <Text variant="caption" className="font-jakarta-semibold">
          {title}
        </Text>
        <Text variant="small" numberOfLines={2}>
          {description}
        </Text>
      </View>
      <Icon icon={ChevronRight} className="text-secondary-strong" />
    </Pressable>
  );
}
