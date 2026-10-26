import { View } from "react-native";
import { Text } from "./text";

/** Hairline with a centered label, e.g. "or". */
export function Divider({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-4">
      <View className="h-px flex-1 bg-border" />
      <Text variant="small">{label}</Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}
