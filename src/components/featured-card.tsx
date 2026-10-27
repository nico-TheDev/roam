import { Image } from "expo-image";
import { ChevronRight, MapPin, Star } from "lucide-react-native";
import { PressableProps, StyleSheet, View } from "react-native";
import { cn } from "./cn";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/** Large photo card for the home feed: rating pill on top, place and title over the photo, round chevron. */
export function FeaturedCard({
    title,
    location,
    rating,
    imageUrl,
    className,
    ...props
}: Omit<PressableProps, "children" | "style"> & {
    title: string;
    location: string;
    rating: number;
    imageUrl: string;
    className?: string;
}) {
    return (
        <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`${title}, ${location}, rated ${rating.toFixed(1)}`}
            className={cn("h-72 overflow-hidden rounded-lg bg-surface-alt", className)}
            {...props}>
            <Image
                source={{ uri: imageUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
            />
            <View className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-scrim to-transparent" />
            <View className="absolute right-4 top-4 h-11 flex-row items-center gap-2 rounded-full bg-surface px-4">
                <Icon icon={Star} size="md" className="text-primary" filled />
                <Text variant="caption" className="font-jakarta-bold">
                    {rating.toFixed(1)}
                </Text>
            </View>
            <View className="absolute inset-x-4 bottom-4 flex-row items-end gap-3">
                <View className="flex-1 gap-1">
                    <View className="flex-row items-center gap-1">
                        <Icon icon={MapPin} size="sm" className="text-on-scrim" filled />
                        <Text variant="small" className="text-on-scrim" numberOfLines={1}>
                            {location}
                        </Text>
                    </View>
                    <Text variant="heading" className="text-on-scrim" numberOfLines={2}>
                        {title}
                    </Text>
                </View>
                <View className="size-14 items-center justify-center rounded-full bg-surface">
                    <Icon icon={ChevronRight} size="lg" />
                </View>
            </View>
        </PressableScale>
    );
}
