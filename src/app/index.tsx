import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ArrowRight, MapPin, TriangleAlert } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Alert, Button, GoogleMark, Icon, OnboardingDashes, SheetShape, Text, Wordmark } from "@/components";
import { useProviderAuth } from "@/lib/auth";

// Sample Unsplash photos, not final assets.
const slides = [
  {
    imageUrl: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1400&q=80",
    location: "Whistler, BC",
    headline: "Find a stay that fits your story",
    body: "From mountain cabins to oceanfront villas, roam helps you find unforgettable stays for every kind of trip.",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1400&q=80",
    location: "Hella, Iceland",
    headline: "Just say what you're after",
    body: "Describe your trip in one sentence, like a quiet pet friendly cabin with a hot tub, and see ranked stays.",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1400&q=80",
    location: "Maldives",
    headline: "Know before you book",
    body: "Check house rules, cancellation and pet policies in the host's own words, with the source shown.",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);
  const authWithProvider = useProviderAuth();
  const [index, setIndex] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const slide = slides[index];

  const continueWithGoogle = async () => {
    setGoogleError(null);
    setGoogleLoading(true);
    const result = await authWithProvider("google");
    setGoogleLoading(false);
    if (!result.ok) setGoogleError(result.error);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index && next >= 0 && next < slides.length) setIndex(next);
  };

  return (
    <View className="flex-1 bg-ink">
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(s) => s.imageUrl}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index: i }) => (
          <View style={{ width }} accessible accessibilityLabel={`${item.location}, slide ${i + 1} of ${slides.length}`}>
            <Image
              source={item.imageUrl}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
              priority={i === 0 ? "high" : "normal"}
            />
          </View>
        )}
      />

      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 top-0 flex-row items-start justify-between px-5"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Wordmark size="sm" tagline={false} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip"
          onPress={() => router.push("/sign-in")}
          className="mt-2 h-12 items-center justify-center rounded-full bg-glass px-5 active:opacity-70"
        >
          <Text variant="caption">Skip</Text>
        </Pressable>
      </View>

      <View pointerEvents="box-none" className="absolute inset-x-0 bottom-0">
        <View className="mb-4 flex-row px-5">
          <Animated.View
            key={`pill-${index}`}
            entering={FadeIn.duration(300)}
            className="h-11 flex-row items-center gap-2 rounded-full border border-on-scrim/30 bg-scrim px-4"
          >
            <Icon icon={MapPin} size="sm" className="text-on-scrim" filled />
            <Text variant="caption" className="text-on-scrim">
              {slide.location}
            </Text>
          </Animated.View>
        </View>

        <SheetShape className="gap-5 px-5 pt-8" style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
          <OnboardingDashes
            count={slides.length}
            activeIndex={index}
            onSelect={(i) => {
              listRef.current?.scrollToIndex({ index: i, animated: true });
              setIndex(i);
            }}
          />
          <Animated.View key={`copy-${index}`} entering={FadeInDown.duration(300)} className="gap-2">
            <Text variant="headline" className="h-[88px]" accessibilityRole="header">
              {slide.headline}
            </Text>
            <Text variant="lead" className="h-[78px]">
              {slide.body}
            </Text>
          </Animated.View>
          {googleError ? (
            <Alert tone="danger" message={googleError} icon={<Icon icon={TriangleAlert} className="text-danger" />} />
          ) : null}
          <View className="gap-3">
            <Button title="Get started" trailing={<Icon icon={ArrowRight} />} onPress={() => router.push("/sign-up")} />
            <Button
              title="Continue with Google"
              variant="secondary"
              icon={<GoogleMark />}
              loading={googleLoading}
              onPress={continueWithGoogle}
            />
          </View>
        </SheetShape>
      </View>
    </View>
  );
}
