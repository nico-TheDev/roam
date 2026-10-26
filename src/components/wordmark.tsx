import { Text as RNText, View } from "react-native";
import { cn } from "./cn";
import { Text } from "./text";

const sizes = {
  xs: "text-[32px] leading-[36px]",
  md: "text-[88px] leading-[88px]",
  sm: "text-[56px] leading-[60px]",
} as const;

/** Placeholder: the design's wordmark is an image that is not in assets/ yet, so this is Outfit ExtraBold text. */
export function Wordmark({
  tagline = true,
  size = "md",
  className,
}: {
  tagline?: boolean;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <View className="gap-2">
      <RNText className={cn("font-brand text-ink", sizes[size], className)} accessibilityRole="header">
        roam
      </RNText>
      {tagline ? (
        <Text variant="title" className="text-muted">
          Find unforgettable stays for every kind of trip.
        </Text>
      ) : null}
    </View>
  );
}
