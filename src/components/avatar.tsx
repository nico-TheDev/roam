import { Image } from "expo-image";
import { View } from "react-native";
import { cn } from "./cn";
import { Text } from "./text";

const sizes = { lg: "size-18", md: "size-16", sm: "size-11" } as const;

/** Round photo on a yellow disc, with initials when there is no photo. */
export function Avatar({
  name,
  imageUrl,
  size = "md",
  className,
}: {
  name: string;
  imageUrl?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${name}'s profile photo`}
      className={cn("items-center justify-center overflow-hidden rounded-full bg-primary", sizes[size], className)}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
      ) : (
        <Text variant="title" className="text-on-primary">
          {initials || "?"}
        </Text>
      )}
    </View>
  );
}
