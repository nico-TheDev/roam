import { View } from "react-native";
import { Surface } from "./surface";
import { Text } from "./text";

/** Showcase panel with the design's "NN. Title" header. */
export function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Surface className="gap-4">
      <View className="flex-row items-baseline gap-2">
        <Text variant="title" className="text-muted">
          {number}.
        </Text>
        <Text variant="title" className="flex-1">
          {title}
        </Text>
      </View>
      {children}
    </Surface>
  );
}
