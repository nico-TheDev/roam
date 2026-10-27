import { Image } from "expo-image";
import { CalendarDays, Users } from "lucide-react-native";
import { PressableProps, View } from "react-native";
import { formatStayDates, formatUsd } from "@/lib/bookings";
import type { Booking } from "@/lib/bookings";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Surface } from "./surface";
import { Text } from "./text";

/** A confirmed booking in the Trips list: photo, stay, dates, guests and what was paid. */
export function BookingCard({ booking, ...props }: Omit<PressableProps, "children"> & { booking: Booking }) {
  const { stay } = booking;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${stay.title}, ${formatStayDates(booking.checkIn, booking.checkOut)}`} {...props}>
      <Surface className="gap-4 p-3">
        <View className="flex-row gap-4">
          {stay.imageUrl ? (
            <Image source={{ uri: `${stay.imageUrl}?w=300&q=80&auto=format` }} className="size-24 rounded-md bg-surface-alt" contentFit="cover" />
          ) : (
            <View className="size-24 rounded-md bg-surface-alt" />
          )}
          <View className="flex-1 justify-center gap-1">
            <Text variant="title-sm" numberOfLines={2}>
              {stay.title}
            </Text>
            <Text variant="small">
              {stay.city}, {stay.state}
            </Text>
          </View>
        </View>
        <View className="gap-2 px-1">
          <View className="flex-row items-center gap-2">
            <Icon icon={CalendarDays} size="sm" className="text-muted" />
            <Text variant="small" className="text-ink">
              {formatStayDates(booking.checkIn, booking.checkOut)}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Icon icon={Users} size="sm" className="text-muted" />
              <Text variant="small">
                {booking.guests} {booking.guests === 1 ? "guest" : "guests"}
              </Text>
            </View>
            <Text variant="small" className="text-ink">
              {formatUsd(booking.amountCents)} paid
            </Text>
          </View>
        </View>
      </Surface>
    </PressableScale>
  );
}
