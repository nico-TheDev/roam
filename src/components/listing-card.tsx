import { Image } from "expo-image";
import { Heart, MapPin, Star } from "lucide-react-native";
import { Pressable, PressableProps, StyleSheet, View } from "react-native";
import { cn } from "./cn";
import { Badge } from "./badge";
import { Icon } from "./icon";
import { Text } from "./text";

export type ListingCardProps = Omit<PressableProps, "children"> & {
  title: string;
  location: string;
  rating: number;
  reviews: number;
  price: number;
  imageUrl: string;
  /** Amenity badges: label plus optional icon. */
  amenities?: { label: string; icon?: React.ReactNode }[];
  favorite?: boolean;
  onToggleFavorite?: () => void;
};

export function ListingCard({
  title,
  location,
  rating,
  reviews,
  price,
  imageUrl,
  amenities = [],
  favorite,
  onToggleFavorite,
  className,
  ...props
}: ListingCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${location}, $${price} per night`}
      className={cn("flex-row gap-4 rounded-lg bg-surface p-3 shadow-card active:opacity-80", className)}
      style={{ borderCurve: "continuous" }}
      {...props}
    >
      <View className="min-h-36 w-36 self-stretch overflow-hidden rounded-md" style={{ borderCurve: "continuous" }}>
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={favorite ? "Remove from favorites" : "Save to favorites"}
          accessibilityState={{ selected: !!favorite }}
          onPress={onToggleFavorite}
          className="absolute right-2 top-2 size-8 items-center justify-center rounded-full bg-surface"
        >
          <Icon icon={Heart} size="sm" className={favorite ? "text-danger" : "text-ink"} filled={favorite} />
        </Pressable>
      </View>
      <View className="flex-1 justify-between py-1">
        <View className="gap-1">
          <Text variant="title" className="font-jakarta-bold" numberOfLines={2}>
            {title}
          </Text>
          <View className="flex-row items-center gap-1">
            <Icon icon={MapPin} size="sm" className="text-muted" />
            <Text variant="small" className="flex-1" numberOfLines={1}>
              {location}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Icon icon={Star} size="sm" className="text-primary" filled />
            <Text variant="caption">{rating.toFixed(1)}</Text>
            <Text variant="small">
              ({reviews})
            </Text>
          </View>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {amenities.map((a) => (
            <Badge key={a.label} label={a.label} icon={a.icon} tone="neutral" size="sm" />
          ))}
        </View>
        <Text variant="title" className="font-jakarta-bold">
          ${price} <Text variant="body" className="font-sans">/ night</Text>
        </Text>
      </View>
    </Pressable>
  );
}
