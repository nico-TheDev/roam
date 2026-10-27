import { CalendarDays, Users } from "lucide-react-native";
import { View } from "react-native";
import { bookingPhase } from "@/lib/booking-rules";
import { formatStayDates, formatUsd } from "@/lib/bookings";
import { Badge } from "./badge";
import { Icon } from "./icon";
import { Text } from "./text";

const PHASE_LABEL = { staying: "Staying now", leaving: "Checks out today" } as const;

/** One booking on a stay the user hosts: dates, guests and what the guest paid. Nothing about the guest. A guest who is already there gets a badge. */
export function HostBookingRow({ checkIn, checkOut, nights, guests, amountCents }: { checkIn: string; checkOut: string; nights: number; guests: number; amountCents: number }) {
  const phase = bookingPhase(checkIn, checkOut);
  const badge = phase === "upcoming" ? null : PHASE_LABEL[phase];
  return (
    <View
      accessible
      accessibilityLabel={`${badge ? `${badge}. ` : ""}${formatStayDates(checkIn, checkOut)}, ${guests} ${guests === 1 ? "guest" : "guests"}, ${formatUsd(amountCents)}`}
      className="gap-2 rounded-md bg-surface-alt p-4"
      style={{ borderCurve: "continuous" }}
    >
      {badge ? <Badge label={badge} tone="success" size="xs" /> : null}
      <View className="flex-row items-center gap-2">
        <Icon icon={CalendarDays} size="sm" className="text-muted" />
        <Text variant="small" className="flex-1 text-ink">
          {formatStayDates(checkIn, checkOut)}
        </Text>
        <Text variant="small">
          {nights} {nights === 1 ? "night" : "nights"}
        </Text>
      </View>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Icon icon={Users} size="sm" className="text-muted" />
          <Text variant="small">
            {guests} {guests === 1 ? "guest" : "guests"}
          </Text>
        </View>
        <Text variant="small" className="text-ink">
          {formatUsd(amountCents)} paid
        </Text>
      </View>
    </View>
  );
}
