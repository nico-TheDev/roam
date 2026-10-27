import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, FileText, Heart, MapPin, MessageCircleMore, Share as ShareIcon } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Share, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AmenityHighlight,
  Alert,
  BookingBar,
  Button,
  HostRow,
  Icon,
  IconButton,
  PolicyCard,
  RatingBox,
  StayGallery,
  Text,
} from "@/components";
import { useEntering } from "@/lib/motion";
import { posthog } from "@/lib/posthog";
import { highlights, priceSummary, useStayDetails } from "@/lib/stay-details";
import type { StayDetails } from "@/lib/stay-details";

export default function StayScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const state = useStayDetails(id);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/home"));

  if (state.status !== "ready") {
    return (
      <View className="flex-1 bg-surface" style={{ paddingTop: insets.top + 8 }}>
        <View className="px-5">
          <IconButton label="Back" variant="outline" onPress={goBack}>
            <Icon icon={ChevronLeft} size="lg" />
          </IconButton>
        </View>
        {state.status === "loading" ? (
          <View className="gap-4 p-5" accessibilityLabel="Loading stay" accessibilityState={{ busy: true }}>
            <View className="h-72 rounded-lg bg-surface-alt" style={{ borderCurve: "continuous" }} />
            <View className="h-8 w-3/4 rounded-sm bg-surface-alt" />
            <View className="h-5 w-1/2 rounded-sm bg-surface-alt" />
          </View>
        ) : state.status === "error" ? (
          <View className="gap-4 p-5">
            <Alert tone="danger" message="We couldn't load this stay. Check your connection and try again." />
            <Button title="Try again" variant="secondary" onPress={state.retry} />
          </View>
        ) : (
          <View className="gap-4 p-5">
            <Text variant="title">This stay is not available</Text>
            <Text variant="body">It may have been removed. Go back and pick another one.</Text>
            <Button title="Back to stays" variant="secondary" onPress={goBack} />
          </View>
        )}
      </View>
    );
  }

  return <StayContent stay={state.stay} source={from} onBack={goBack} />;
}

function StayContent({ stay, source, onBack }: { stay: StayDetails; source?: string; onBack: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [favorite, setFavorite] = useState(false);
  const [soon, setSoon] = useState(false);
  const opened = useRef<string | null>(null);

  // Once per visit, and never with anything the guest typed.
  useEffect(() => {
    if (opened.current === stay.id) return;
    opened.current = stay.id;
    posthog?.capture("stay_opened", {
      stay_id: stay.id,
      category: stay.category,
      price_per_night: stay.nightlyPrice,
      rating: stay.rating,
      source: source === "home" || source === "search" ? source : "link",
    });
  }, [stay, source]);

  useEffect(() => {
    if (!soon) return;
    const timer = setTimeout(() => setSoon(false), 3000);
    return () => clearTimeout(timer);
  }, [soon]);

  const entering = [useEntering(0), useEntering(1), useEntering(2), useEntering(3)];
  const { total, nights } = priceSummary(stay);
  const items = highlights(stay);
  const openPolicies = (focus?: "cancellation") =>
    router.push({ pathname: "/stay/[id]/policies", params: { id: stay.id, ...(focus ? { focus } : {}) } });

  const share = () => {
    Share.share({ message: `${stay.title} in ${stay.city}, ${stay.state} on Roam` }).catch(() => {});
  };

  const book = () => {
    posthog?.capture("stay_book_tapped", { stay_id: stay.id });
    setSoon(true);
  };

  return (
    <View className="flex-1 bg-surface">
      <ScrollView contentContainerClassName="pb-6" showsVerticalScrollIndicator={false}>
        <StayGallery imageUrls={stay.imageUrls} label={stay.title}>
          <View className="absolute inset-x-5 flex-row items-center gap-3" style={{ top: insets.top + 8 }}>
            <IconButton label="Back" variant="outline" className="border-0" onPress={onBack}>
              <Icon icon={ChevronLeft} size="lg" />
            </IconButton>
            <View className="flex-1" />
            <IconButton label="Share" variant="outline" className="border-0" onPress={share}>
              <Icon icon={ShareIcon} size="lg" />
            </IconButton>
            <IconButton
              label={favorite ? "Remove from favorites" : "Save to favorites"}
              variant="outline"
              className="border-0"
              onPress={() => setFavorite((f) => !f)}
            >
              <Icon icon={Heart} size="lg" filled={favorite} />
            </IconButton>
          </View>
        </StayGallery>

        <View className="-mt-6 gap-5 rounded-t-lg bg-surface px-5 pt-6">
          <Animated.View entering={entering[0]} className="gap-3">
            <View className="flex-row items-start gap-4">
              <Text variant="heading" className="flex-1">
                {stay.title}
              </Text>
              <RatingBox rating={stay.rating} reviews={stay.reviewCount} />
            </View>
            <View className="flex-row items-center gap-2">
              <Icon icon={MapPin} size="md" filled />
              <Text variant="lead" className="text-ink">
                {stay.city}, {stay.state}
              </Text>
            </View>
          </Animated.View>

          {items.length > 0 ? (
            <Animated.View entering={entering[1]} className="flex-row gap-2 border-b border-border pb-5">
              {items.map((a) => (
                <AmenityHighlight key={a.label} icon={a.icon} label={a.label} />
              ))}
            </Animated.View>
          ) : null}

          <Animated.View entering={entering[2]} className="gap-3">
            <PolicyCard
              icon={<Icon icon={MessageCircleMore} size="lg" className="text-secondary-strong" />}
              title="Ask about policies"
              description="Cancellation, house rules, pets, check-in and more."
              onPress={() => router.push({ pathname: "/stay/[id]/ask", params: { id: stay.id } })}
            />
            {stay.cancellationPolicy ? (
              <PolicyCard
                icon={<Icon icon={FileText} size="lg" className="text-secondary-strong" />}
                title={stay.cancellationPolicy.title}
                description={stay.cancellationPolicy.summary}
                onPress={() => openPolicies("cancellation")}
              />
            ) : null}
          </Animated.View>

          {stay.host ? (
            <Animated.View entering={entering[3]} className="border-t border-border pt-5">
              <HostRow
                name={stay.host.name}
                photoUrl={stay.host.photoUrl}
                isSuperhost={stay.host.isSuperhost}
                hostingSince={stay.host.hostingSince}
                onPress={() => router.push({ pathname: "/stay/[id]/host", params: { id: stay.id } })}
              />
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>

      {soon ? (
        <View className="px-5 pb-3">
          <Alert message="Booking is coming soon." />
        </View>
      ) : null}
      <BookingBar
        price={stay.nightlyPrice}
        totalLabel={`$${total} total · ${nights} ${nights === 1 ? "night" : "nights"}`}
        onBook={book}
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      />
    </View>
  );
}
