import { Minus, Plus } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { cn } from "./cn";
import { Icon } from "./icon";
import { Text } from "./text";

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  className?: string;
}) {
  const canDec = value > min;
  const canInc = value < max;
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "increment" && canInc) onChange(value + 1);
        if (e.nativeEvent.actionName === "decrement" && canDec) onChange(value - 1);
      }}
      className={cn("h-14 flex-row items-center rounded-full border border-border bg-surface px-2", className)}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        disabled={!canDec}
        onPress={() => onChange(value - 1)}
        className={cn("size-10 items-center justify-center rounded-full active:bg-surface-alt", !canDec && "opacity-40")}
      >
        <Icon icon={Minus} />
      </Pressable>
      <Text variant="button" className="min-w-10 text-center">
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        disabled={!canInc}
        onPress={() => onChange(value + 1)}
        className={cn("size-10 items-center justify-center rounded-full active:bg-surface-alt", !canInc && "opacity-40")}
      >
        <Icon icon={Plus} />
      </Pressable>
    </View>
  );
}
