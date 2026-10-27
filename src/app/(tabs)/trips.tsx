import { CalendarDays } from "lucide-react-native";
import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { Alert, BookingCard, Button, Icon, Text } from "@/components";
import { messageFor, useBookings } from "@/lib/bookings";
import { posthog } from "@/lib/posthog";
import { useEffect, useRef } from "react";

// Confirmed bookings only: a row exists once Stripe confirmed payment.
export default function Trips() {
  const router = useRouter();
  const { state, retry } = useBookings();
  const reported = useRef(false);

  useEffect(() => {
    if (state.status !== "ready" || reported.current) return;
    reported.current = true;
    posthog?.capture("trips_opened", { count: state.data.length });
  }, [state]);

  if (state.status === "loading") {
    return (
      <View className="flex-1 gap-4 bg-surface px-5 pt-4" accessibilityLabel="Loading trips" accessibilityState={{ busy: true }}>
        <View className="h-40 rounded-lg bg-surface-alt" />
        <View className="h-40 rounded-lg bg-surface-alt" />
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View className="flex-1 justify-center gap-4 bg-surface px-5">
        <Alert tone="danger" message={messageFor(state.reason)} />
        <Button title="Try again" variant="secondary" onPress={retry} />
      </View>
    );
  }

  if (state.data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-surface px-5">
        <View className="size-20 items-center justify-center rounded-full bg-surface-alt">
          <Icon icon={CalendarDays} size="lg" />
        </View>
        <Text variant="heading">No trips yet</Text>
        <Text variant="body" className="text-center">
          Stays you book will show up here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="gap-4 px-5 pb-8 pt-4" contentInsetAdjustmentBehavior="automatic">
      <Text variant="heading">Your trips</Text>
      {state.data.map((booking) => (
        <BookingCard key={booking.id} booking={booking} onPress={() => {
            posthog?.capture("trip_opened", { stay_id: booking.stayId });
            router.push({ pathname: "/stay/[id]", params: { id: booking.stayId } });
          }}
        />
      ))}
    </ScrollView>
  );
}
