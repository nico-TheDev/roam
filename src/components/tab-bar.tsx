import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import type { LucideIcon } from "lucide-react-native";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { cn } from "./cn";
import { Icon } from "./icon";
import { Text } from "./text";

export type TabItem<K extends string> = { key: K; label: string; icon: LucideIcon };

/** Floating glass tab bar. Presentational: Expo Router tabs will wrap it later. */
export function TabBar<K extends string>({
  items,
  activeKey,
  onChange,
  className,
}: {
  items: TabItem<K>[];
  activeKey: K;
  onChange: (key: K) => void;
  className?: string;
}) {
  const glass = Platform.OS === "ios" && isGlassEffectAPIAvailable();
  return (
    // Layout lives on a plain View: GlassView does not take className, so it is only a backdrop.
    <View
      accessibilityRole="tablist"
      className={cn(
        "flex-row items-center justify-between overflow-hidden rounded-full p-2",
        !glass && "border border-border bg-glass",
        className,
      )}
    >
      {glass ? <GlassView style={StyleSheet.absoluteFill} /> : null}
      {items.map((item) => {
        const selected = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(item.key)}
            className="flex-1 items-center"
          >
            <View
              className={cn(
                "size-16 items-center justify-center gap-1 rounded-full",
                selected && "bg-primary",
              )}
            >
              <Icon icon={item.icon} />
              <Text variant="caption" className="text-xs leading-4">
                {item.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
