import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleAlert, CircleCheck } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { Button, Icon, PriceBreakdown, Surface, Text } from "@/components";
import { formatStayDates, useBookingStatus } from "@/lib/bookings";
import { posthog } from "@/lib/posthog";

// `id` is the hold id. The screen only reads what the server says; the booking exists once Stripe confirmed payment.
export default function BookingConfirmation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const status = useBookingStatus(id, attempt);
  const reported = useRef(false);

  useEffect(() => {
    if (status.status !== "confirmed" || reported.current) return;
    reported.current = true;
    posthog?.capture("booking_confirmed", {
      stay_id: status.booking.stayId,
      nights: status.booking.breakdown.nights,
      amount_cents: status.booking.amountCents,
    });
  }, [status]);

  const done = () => router.replace("/trips");

  if (status.status === "pending") {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-surface px-5" accessibilityLiveRegion="polite">
        <ActivityIndicator />
        <Text variant="heading">Confirming your booking…</Text>
        <Text variant="body" className="text-center">
          Your payment went through. This takes a few seconds.
        </Text>
      </View>
    );
  }

  if (status.status === "confirmed") {
    const { booking } = status;
    return (
      <ScrollView className="flex-1 bg-surface" contentContainerClassName="gap-6 px-5 pb-10 pt-16">
        <View className="items-center gap-3">
          <View className="size-20 items-center justify-center rounded-full bg-success-soft">
            <Icon icon={CircleCheck} size="lg" className="text-success" />
          </View>
          <Text variant="headline-sm" className="text-center">
            You&apos;re booked
          </Text>
          <Text variant="body" className="text-center">
            {booking.stay.title}, {booking.stay.city}, {booking.stay.state}
          </Text>
        </View>
        <Surface variant="flat" className="gap-3">
          <Text variant="title-sm">{formatStayDates(booking.checkIn, booking.checkOut)}</Text>
          <Text variant="body">
            {booking.guests} {booking.guests === 1 ? "guest" : "guests"}
          </Text>
          <PriceBreakdown
            breakdown={booking.breakdown}
            totalCents={booking.amountCents}
          />
        </Surface>
        {booking.stay.cancellationPolicy ? (
          <View className="gap-2">
            <Text variant="title-sm">{booking.stay.cancellationPolicy.title}</Text>
            <Text variant="body">{booking.stay.cancellationPolicy.body}</Text>
          </View>
        ) : null}
        <Button title="View my trips" onPress={done} />
      </ScrollView>
    );
  }

  const copy = {
    refunded: ["Those dates were taken first", "Someone else's booking was confirmed for these dates before your payment finished. We've refunded you in full."],
    expired: ["Your hold ran out", "The dates were released before payment finished. Pick your dates again to book."],
    failed: ["The payment didn't go through", "You haven't been charged for a booking. Pick your dates and try again."],
    unknown: ["Still confirming", "Your payment may still be processing. Check your trips in a minute, or check again now."],
    error: ["We couldn't check your booking", "Check your connection and try again. If you were charged, the booking will appear in your trips."],
  }[status.status];

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-surface px-5">
      <View className="size-20 items-center justify-center rounded-full bg-surface-alt">
        <Icon icon={CircleAlert} size="lg" />
      </View>
      <Text variant="heading" className="text-center">
        {copy[0]}
      </Text>
      <Text variant="body" className="text-center">
        {copy[1]}
      </Text>
      {status.status === "unknown" || status.status === "error" ? (
        <Button title="Check again" onPress={() => setAttempt((n) => n + 1)} className="self-stretch" />
      ) : null}
      <Button title="Back to my trips" variant="secondary" onPress={done} className="self-stretch" />
    </View>
  );
}
