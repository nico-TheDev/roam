import { View, ViewProps } from "react-native";
import { Button } from "./button";
import { cn } from "./cn";
import { Text } from "./text";

/** Sticky bottom bar: nightly price and an estimated total on the left, the booking button on the right. */
export function BookingBar({
  price,
  totalLabel,
  onBook,
  className,
  style,
}: {
  price: number;
  totalLabel: string;
  onBook: () => void;
  className?: string;
  style?: ViewProps["style"];
}) {
  return (
    <View className={cn("flex-row items-center gap-4 border-t border-border bg-surface px-5 pt-4", className)}
      style={style}>
      <View className="gap-1">
        <Text variant="title">
          ${price} <Text variant="body">/ night</Text>
        </Text>
        <Text variant="body">{totalLabel}</Text>
      </View>
      <Button title="Book this stay" onPress={onBook} className="flex-1" />
    </View>
  );
}
