import { useRouter } from "expo-router";
import { ChevronLeft, Heart } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Alert, Button, Icon, IconButton, ListingCard, Text } from "@/components";
import { useEntering } from "@/lib/motion";
import { posthog } from "@/lib/posthog";
import { useSavedStays } from "@/lib/saved";
import { useSavedStayDetails } from "@/lib/saved-stays";
import { badges } from "@/lib/stay-badges";

// Opened from the Saved stat on Profile. The list is fixed to what was saved on arrival: unsaving here empties the heart
// but keeps the card, so a slip can be undone; the next visit shows the new list.
export default function Saved() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const saved = useSavedStays();
  const [openedWith] = useState(() => saved.ids);
  const state = useSavedStayDetails(openedWith);
  const reported = useRef(false);

  useEffect(() => {
    if (reported.current || state.status !== "ready") return;
    reported.current = true;
    posthog?.capture("saved_stays_opened", { count: state.stays.length });
  }, [state]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/profile"));

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="gap-5 px-5 pb-8"
      contentContainerStyle={{ paddingTop: insets.top + 8 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center gap-3">
        <IconButton label="Back" variant="outline" onPress={goBack}>
          <Icon icon={ChevronLeft} size="lg" />
        </IconButton>
        <Text variant="heading" className="flex-1">
          Saved stays
        </Text>
      </View>

      {saved.error ? <Alert tone="danger" message={saved.error} onDismiss={saved.dismissError} /> : null}

      {state.status === "loading" ? (
        <View className="gap-3" accessibilityLabel="Loading saved stays" accessibilityState={{ busy: true }}>
          {[0, 1, 2].map((i) => (
            <View key={i} className="h-36 rounded-lg bg-surface-alt" style={{ borderCurve: "continuous" }} />
          ))}
        </View>
      ) : state.status === "error" ? (
        <View className="gap-3">
          <Alert tone="danger" message="We couldn't load your saved stays. Check your connection and try again." />
          <Button title="Try again" variant="secondary" onPress={state.retry} />
        </View>
      ) : state.stays.length === 0 ? (
        <Empty onFind={() => router.navigate("/search")} />
      ) : (
        <View className="gap-3">
          {state.stays.map((p, i) => (
            <Row key={p.id} index={i}>
              <ListingCard
                onPress={() => router.push({ pathname: "/stay/[id]", params: { id: p.id, from: "link" } })}
                title={p.title}
                location={`${p.city}, ${p.state}`}
                rating={p.rating}
                reviews={p.reviewCount}
                price={p.price}
                imageUrl={p.imageUrl}
                amenities={badges(p)}
                favorite={saved.isSaved(p.id)}
                onToggleFavorite={() => saved.toggle(p.id)}
                favoritePlacement="inline"
              />
            </Row>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Row({ index, children }: { index: number; children: React.ReactNode }) {
  return <Animated.View entering={useEntering(index, { stagger: 40 })}>{children}</Animated.View>;
}

function Empty({ onFind }: { onFind: () => void }) {
  return (
    <Animated.View entering={useEntering(0)} className="items-center gap-3 pt-16">
      <View className="size-20 items-center justify-center rounded-full bg-surface-alt">
        <Icon icon={Heart} size="lg" />
      </View>
      <Text variant="heading">No saved stays yet</Text>
      <Text variant="body" className="text-center">
        Tap the heart on a stay to keep it here.
      </Text>
      <Button title="Find a stay" onPress={onFind} />
    </Animated.View>
  );
}
