import { Star } from "lucide-react-native";
import { View } from "react-native";
import { Icon } from "./icon";
import { Text } from "./text";

/** Rounded box with the star rating over the review count. */
export function RatingBox({ rating, reviews }: { rating: number; reviews: number }) {
    return (
        <View
            accessible
            accessibilityLabel={`Rated ${rating.toFixed(1)} from ${reviews} reviews`}
            className="items-center rounded-md bg-surface-alt px-4 py-2"
            style={{ borderCurve: "continuous" }}>
            <View className="flex-row items-center gap-1">
                <Icon icon={Star} size="md" className="text-primary" />
                <Text variant="title-sm">{rating.toFixed(1)}</Text>
            </View>
            <Text variant="small">({reviews})</Text>
        </View>
    );
}
