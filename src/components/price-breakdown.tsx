import { View, ViewProps } from "react-native";
import { formatUsd } from "@/lib/bookings";
import type { Breakdown } from "@/lib/booking-rules";
import { cn } from "./cn";
import { Text } from "./text";

/** The server's price, line by line. Never computes a total itself. */
export function PriceBreakdown({ breakdown, totalCents, className, ...props }: ViewProps & { breakdown: Breakdown; totalCents: number }) {
  const { nights, nightlyCents, cleaningCents } = breakdown;
  return (
    <View className={cn("gap-3", className)} {...props}>
      <Row label={`${formatUsd(nightlyCents)} × ${nights} ${nights === 1 ? "night" : "nights"}`} value={formatUsd(nightlyCents * nights)} />
      {cleaningCents > 0 ? <Row label="Cleaning fee" value={formatUsd(cleaningCents)} /> : null}
      <View className="h-px bg-border" />
      <Row label="Total (USD)" value={formatUsd(totalCents)} strong />
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text variant={strong ? "title-sm" : "body"}>{label}</Text>
      <Text variant={strong ? "title-sm" : "body"} className={strong ? undefined : "text-ink"}>
        {value}
      </Text>
    </View>
  );
}
