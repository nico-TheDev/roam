import { useUser } from "@clerk/expo";
import { PaymentSheetError, useStripe } from "@/lib/stripe-native";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { Alert, Button, DateRangeCalendar, PriceBreakdown, Stepper, Text } from "@/components";
import { BookingError, formatStayDates, formatUsd, messageFor, useAvailability, useBookingApi, useQuote } from "@/lib/bookings";
import { localToday } from "@/lib/calendar";
import { posthog } from "@/lib/posthog";
import { useStayDetails } from "@/lib/stay-details";

const paymentsConfigured = !!process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Form sheet opened from "Book this stay". The server prices and holds the dates; the app only shows its answer
// and opens Stripe's payment sheet. The booking itself is created after Stripe confirms payment (booking/[id]).
export default function BookStay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const details = useStayDetails(id);
  const stay = details.status === "ready" ? details.stay : null;
  const router = useRouter();
  const { user } = useUser();
  const api = useBookingApi();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const today = useMemo(() => localToday(), []);

  const [dates, setDates] = useState<{ checkIn: string | null; checkOut: string | null }>({ checkIn: null, checkOut: null });
  const [guestsChoice, setGuests] = useState(2);
  const guests = Math.min(guestsChoice, stay?.maxGuests ?? 1);
  const [phase, setPhase] = useState<"edit" | "starting" | "paying">("edit");
  const [error, setError] = useState<string | null>(null);
  const [heldUntil, setHeldUntil] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  const availability = useAvailability(id);
  const quote = useQuote(id, dates.checkIn, dates.checkOut, guests, refresh);

  const quoted = useRef(false);
  const failedReason = quote.status === "error" ? quote.reason : null;
  useEffect(() => {
    // The first quote of the visit only; later date changes send nothing.
    if (quote.status === "ready" && !quoted.current) {
      quoted.current = true;
      posthog?.capture("booking_quote_viewed", { stay_id: id, nights: quote.quote.nights, guests, total_cents: quote.quote.totalCents });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.status]);
  useEffect(() => {
    if (failedReason) posthog?.capture("booking_quote_failed", { stay_id: id, reason: failedReason });
  }, [failedReason, id]);

  if (!stay) {
    return (
      <View className="flex-1 gap-4 bg-surface px-5 pt-6">
        <Text variant="heading">Book this stay</Text>
        {details.status === "error" ? (
          <>
            <Alert tone="danger" message="We couldn't load this stay. Check your connection and try again." />
            <Button title="Try again" variant="secondary" onPress={details.retry} />
          </>
        ) : details.status === "not-found" ? (
          <Text variant="body">This stay is no longer available.</Text>
        ) : (
          <View className="h-72 rounded-lg bg-surface-alt" accessibilityLabel="Loading stay" accessibilityState={{ busy: true }} />
        )}
      </View>
    );
  }

  const blocked = availability.state.status === "ready" ? availability.state.data : [];
  const ready = quote.status === "ready" && availability.state.status === "ready" && phase === "edit" && paymentsConfigured;

  const pay = async () => {
    if (!dates.checkIn || !dates.checkOut || quote.status !== "ready") return;
    setPhase("starting");
    setError(null);
    try {
      const checkout = await api.checkout({ stayId: stay.id, checkIn: dates.checkIn, checkOut: dates.checkOut, guests });
      posthog?.capture("booking_checkout_started", { stay_id: stay.id, nights: quote.quote.nights, guests });
      setHeldUntil(checkout.expiresAt);

      if (checkout.clientSecret && !checkout.paid) {
        const init = await initPaymentSheet({
          merchantDisplayName: "Roam",
          paymentIntentClientSecret: checkout.clientSecret,
          returnURL: Linking.createURL("stripe-redirect"),
          defaultBillingDetails: {
            name: user?.fullName ?? undefined,
            email: user?.primaryEmailAddress?.emailAddress,
          },
        });
        if (init.error) throw new BookingError("server");

        setPhase("paying");
        const result = await presentPaymentSheet();
        if (result.error) {
          const canceled = result.error.code === PaymentSheetError.Canceled;
          posthog?.capture("booking_payment_result", { stay_id: stay.id, outcome: canceled ? "canceled" : "failed", ...(canceled ? {} : { reason: result.error.code }) });
          if (!canceled) setError(result.error.message);
          setPhase("edit");
          return;
        }
        posthog?.capture("booking_payment_result", { stay_id: stay.id, outcome: "paid" });
      }
      // Paid, or already paid: the confirmation screen waits for the server to book it.
      router.dismiss();
      router.push({ pathname: "/booking/[id]", params: { id: checkout.holdId } });
    } catch (e) {
      const reason = e instanceof BookingError ? e.reason : "server";
      setPhase("edit");
      setError(messageFor(reason));
      if (reason !== "unavailable") posthog?.capture("booking_checkout_failed", { stay_id: stay.id, reason });
      if (reason === "unavailable") {
        posthog?.capture("booking_unavailable", { stay_id: stay.id, reason });
        setDates({ checkIn: null, checkOut: null });
        availability.reload();
      }
      setRefresh((n) => n + 1);
    }
  };

  const quoteMessage = quote.status === "error" ? messageFor(quote.reason) : null;

  return (
    <View className="flex-1 bg-surface">
      <View className="gap-1 px-5 pb-2 pt-6">
        <Text variant="heading">Select dates</Text>
        <Text variant="body">
          {stay.title}. Minimum stay {stay.minNights} {stay.minNights === 1 ? "night" : "nights"}.
        </Text>
      </View>
      <ScrollView className="flex-1 bg-surface" contentContainerClassName="gap-6 px-5 pb-6 pt-4" keyboardShouldPersistTaps="handled">

        {availability.state.status === "error" ? (
          <View className="gap-3">
            <Alert tone="danger" message={messageFor(availability.state.reason)} />
            <Button title="Try again" variant="secondary" onPress={availability.reload} />
          </View>
        ) : (
          <View accessibilityState={{ busy: availability.state.status === "loading" }} className={availability.state.status === "loading" ? "opacity-60" : undefined}>
            <DateRangeCalendar checkIn={dates.checkIn} checkOut={dates.checkOut} onChange={setDates} blocked={blocked} today={today} />
          </View>
        )}

        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1 gap-1">
            <Text variant="title-sm">Guests</Text>
            <Text variant="small">Up to {stay.maxGuests}</Text>
          </View>
          <Stepper label="guests" value={guests} min={1} max={stay.maxGuests} onChange={setGuests} />
        </View>

        {dates.checkIn && dates.checkOut ? (
          <View className="gap-3" accessibilityLiveRegion="polite">
            <Text variant="title-sm">{formatStayDates(dates.checkIn, dates.checkOut)}</Text>
            {quote.status === "ready" ? (
              <PriceBreakdown breakdown={quote.quote.breakdown} totalCents={quote.quote.totalCents} />
            ) : quote.status === "error" ? (
              <Alert tone="danger" message={quoteMessage ?? ""} />
            ) : (
              <View className="h-24 rounded-md bg-surface-alt" accessibilityLabel="Calculating price" accessibilityState={{ busy: true }} />
            )}
          </View>
        ) : (
          <Text variant="body">Tap a check-in day, then a check-out day.</Text>
        )}

        {error ? <Alert tone="danger" message={error} /> : null}
        {!paymentsConfigured ? <Alert tone="danger" message="Payments aren't set up in this build yet." /> : null}
        {heldUntil && phase === "edit" && !error ? (
          <Text variant="small">Your dates are held until {new Date(heldUntil).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.</Text>
        ) : null}
      </ScrollView>

      <View className="gap-2 border-t border-border bg-surface px-5 pb-8 pt-4">
        <Button
          title={quote.status === "ready" ? `Pay ${formatUsd(quote.quote.totalCents)}` : "Choose your dates"}
          disabled={!ready}
          loading={phase === "starting"}
          onPress={pay}
        />
        <Text variant="micro" className="text-center">
          Demo: Stripe test mode, no real charge. Pay with card 4242 4242 4242 4242, any future date and CVC.
        </Text>
      </View>
    </View>
  );
}
