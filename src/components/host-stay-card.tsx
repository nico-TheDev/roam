import { Image } from "expo-image";
import { CalendarDays } from "lucide-react-native";
import { PressableProps, View } from "react-native";
import { Badge } from "./badge";
import { cn } from "./cn";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Surface } from "./surface";
import { Text } from "./text";
import { Toggle } from "./toggle";

/**
 * A stay on the host overview: cover, title, place, price, whether it is listed, the next booking and a switch to
 * pause it. The card opens the stay manager; the switch only pauses or resumes.
 */
export function HostStayCard({
  title,
  location,
  price,
  imageUrl,
  listed,
  nextBooking,
  switching,
  onToggleListed,
  ...props
}: Omit<PressableProps, "children"> & {
  title: string;
  location: string;
  price: number;
  imageUrl: string | null;
  listed: boolean;
  /** "Staying now · Dec 10 – 13, 2026 · 2 guests", or null when nothing is booked. */
  nextBooking: string | null;
  switching?: boolean;
  onToggleListed: (listed: boolean) => void;
}) {
  return (
    <Surface className="gap-3 p-3">
      <PressableScale accessibilityRole="button" accessibilityLabel={`${title}, ${listed ? "listed" : "paused"}. Manage`} {...props}>
        <View className="flex-row gap-4">
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              className={cn("size-24 rounded-md bg-surface-alt", !listed && "opacity-60")}
              contentFit="cover"
            />
          ) : (
            <View className="size-24 rounded-md bg-surface-alt" />
          )}
          <View className="flex-1 gap-1">
            <Badge label={listed ? "Listed" : "Paused"} tone={listed ? "success" : "neutral"} size="xs" />
            <Text variant="title-sm" numberOfLines={2} className={cn(!listed && "text-muted")}>
              {title}
            </Text>
            <Text variant="small">
              {location} · ${price} / night
            </Text>
          </View>
        </View>
      </PressableScale>
      <View className="flex-row items-center gap-2 px-1">
        <Icon icon={CalendarDays} size="sm" className="text-muted" />
        <Text variant="small" className="flex-1 text-ink" numberOfLines={1}>
          {nextBooking ?? "No current or upcoming bookings"}
        </Text>
        <Toggle label={`${title} listed`} value={listed} disabled={switching} onValueChange={onToggleListed} />
      </View>
    </Surface>
  );
}
