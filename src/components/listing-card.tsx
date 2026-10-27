import { Image } from "expo-image";
import { Heart, MapPin, Star } from "lucide-react-native";
import { PressableProps, StyleSheet, View } from "react-native";
import { cn } from "./cn";
import { Badge } from "./badge";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";
import { PressableScale } from "./pressable-scale";
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
  /** `image`: small heart over the photo. `inline`: larger heart beside the title (the search results design). */
  favoritePlacement?: "image" | "inline";
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
  favoritePlacement = "image",
  className,
  ...props
}: ListingCardProps) {
  const favoriteLabel = favorite ? "Remove from favorites" : "Save to favorites";
  const heart = (size: "sm" | "md") => (
    <Icon icon={Heart} size={size} className={favorite ? "text-danger" : "text-ink"} filled={favorite} />
  );
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${location}, $${price} per night`}
      className={cn("flex-row gap-3 rounded-lg bg-surface p-3 shadow-card", className)}
      style={{ borderCurve: "continuous" }}
      {...props}
    >
      <View className="aspect-square w-36 self-start overflow-hidden rounded-md" style={{ borderCurve: "continuous" }}>
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        {favoritePlacement === "image" ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={favoriteLabel}
            accessibilityState={{ selected: !!favorite }}
            onPress={onToggleFavorite}
            wrapperClassName="absolute right-2 top-2"
            className="size-8 items-center justify-center rounded-full bg-surface"
          >
            {heart("sm")}
          </PressableScale>
        ) : null}
      </View>
      <View className="flex-1 justify-between py-1">
        <View className="gap-1">
          <View className="flex-row items-start gap-2">
            <Text variant="title-sm" className="flex-1" numberOfLines={2}>
              {title}
            </Text>
            {favoritePlacement === "inline" ? (
              <IconButton label={favoriteLabel} size="sm" selected={false} onPress={onToggleFavorite}>
                {heart("md")}
              </IconButton>
            ) : null}
          </View>
          <View className="flex-row items-center gap-1">
            <Icon icon={MapPin} size="sm" className="text-muted" />
            <Text variant="micro" className="flex-1" numberOfLines={1}>
              {location}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Icon icon={Star} size="sm" className="text-primary" filled />
            <Text variant="micro" className="text-ink">{rating.toFixed(1)}</Text>
            <Text variant="micro">
              ({reviews})
            </Text>
          </View>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {amenities.map((a) => (
            <Badge key={a.label} label={a.label} icon={a.icon} tone="neutral" size="xs" />
          ))}
        </View>
        <Text variant="title-sm">
          ${price} <Text variant="micro">/ night</Text>
        </Text>
      </View>
    </PressableScale>
  );
}
