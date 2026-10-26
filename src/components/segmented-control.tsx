import { Pressable, View } from "react-native";
import { cn } from "./cn";
import { Text } from "./text";

export type SegmentOption<K extends string> = {
  key: K;
  label: string;
  /** Receives whether the segment is selected so the icon can switch color. */
  icon?: (selected: boolean) => React.ReactNode;
};

export function SegmentedControl<K extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentOption<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
}) {
  return (
    <View
      accessibilityRole="tablist"
      className={cn("h-14 flex-row rounded-full bg-surface-alt p-1", className)}
    >
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.key)}
            className={cn(
              "flex-1 flex-row items-center justify-center gap-2 rounded-full",
              selected && "bg-ink",
            )}
          >
            {o.icon?.(selected)}
            <Text variant="caption" className={selected ? "text-surface" : "text-ink"}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
