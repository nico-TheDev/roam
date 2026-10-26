import { View } from "react-native";
import { Text } from "./text";

/** Placeholder: the design's wordmark is an image that is not in assets/ yet. */
export function Wordmark({ tagline = true }: { tagline?: boolean }) {
  return (
    <View className="gap-2">
      <Text variant="display" className="text-[88px] leading-[88px]" accessibilityRole="header">
        roam
      </Text>
      {tagline ? (
        <Text variant="title" className="text-muted">
          Find unforgettable stays for every kind of trip.
        </Text>
      ) : null}
    </View>
  );
}
