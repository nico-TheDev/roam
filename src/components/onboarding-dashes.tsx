import { Pressable, View } from "react-native";
import { cn } from "./cn";

/** Step indicator: one tappable dash per slide, the active one lavender. */
export function OnboardingDashes({
  count,
  activeIndex,
  onSelect,
}: {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <View accessibilityRole="tablist" className="flex-row gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Pressable
          key={i}
          accessibilityRole="tab"
          accessibilityLabel={`Slide ${i + 1} of ${count}`}
          accessibilityState={{ selected: i === activeIndex }}
          hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}
          onPress={() => onSelect(i)}
          className={cn("h-1 w-9 rounded-full", i === activeIndex ? "bg-secondary" : "bg-surface-alt")}
        />
      ))}
    </View>
  );
}
