import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { Building2, House, Search, Tent, TreePalm, Waves } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { Alert, Avatar, Button, Chip, FeaturedCard, Icon, IconButton, SearchInputRef, SearchPill, Text, Wordmark } from "@/components";
import type { Category } from "@/lib/search";
import { useEntering } from "@/lib/motion";
import { posthog } from "@/lib/posthog";
import { useFeaturedStays } from "@/lib/stays";

const categories: { key: Category | "all"; label: string; icon: LucideIcon }[] = [
  { key: "all", label: "All Stays", icon: House },
  { key: "cabin", label: "Cabins", icon: Tent },
  { key: "beach", label: "Beach", icon: Waves },
  { key: "city", label: "City", icon: Building2 },
  { key: "villa", label: "Villas", icon: TreePalm },
];

// Shown in the bar, and searched when the guest taps the arrow with nothing typed.
const EXAMPLE = "quiet pet friendly cabin with hot tub";

export default function Home() {
  const { user } = useUser();
  const router = useRouter();
  const inputRef = useRef<SearchInputRef>(null);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  // Rows that appear after a category tap start right away instead of waiting behind the header's stagger.
  const [filtered, setFiltered] = useState(false);

  const featuredStays = useFeaturedStays();

  const submit = () => {
    const q = text.trim() || EXAMPLE;
    router.navigate({ pathname: "/search", params: { q, from: "home" } });
  };

  const name = user?.fullName ?? user?.firstName ?? "Guest";

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="gap-5 px-5 pb-8 pt-4"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Animated.View entering={useEntering(0)} className="flex-row items-center justify-between">
        <Wordmark size="sm" tagline={false} />
        <Avatar name={name} imageUrl={user?.imageUrl} />
      </Animated.View>

      <Animated.View entering={useEntering(1)} className="flex-row items-center justify-between gap-4">
        <View className="flex-1 gap-2">
          <Text variant="lead" className="font-jakarta-semibold">
            Hey, {user?.firstName ?? "there"} 👋
          </Text>
          <Text variant="headline">Find your next stay</Text>
        </View>
        <IconButton label="Search stays" size="tall" onPress={() => inputRef.current?.focus()}>
          <Icon icon={Search} size="lg" />
        </IconButton>
      </Animated.View>

      <Animated.View entering={useEntering(2)}>
        <SearchPill
          inputRef={inputRef}
          value={text}
          onChangeText={setText}
          onSubmit={submit}
          placeholder={EXAMPLE}
        />
      </Animated.View>

      <Animated.View entering={useEntering(3)} className="flex-row flex-wrap gap-3">
        {categories.map(({ key, label, icon }) => (
          <Chip
            key={key}
            variant="accent"
            label={label}
            icon={<Icon icon={icon} size="md" />}
            selected={category === key}
            onPress={() => {
              posthog?.capture("stay_category_selected", { category: key });
              setCategory(key);
              setFiltered(true);
            }}
          />
        ))}
      </Animated.View>

      {featuredStays.status === "loading" ? (
        <View className="gap-5" accessibilityLabel="Loading stays" accessibilityState={{ busy: true }}>
          {[0, 1, 2].map((i) => (
            <View key={i} className="h-72 rounded-lg bg-surface-alt" style={{ borderCurve: "continuous" }} />
          ))}
        </View>
      ) : featuredStays.status === "error" ? (
        <View className="gap-4">
          <Alert tone="danger" message="We couldn't load stays. Check your connection and try again." />
          <Button title="Try again" variant="secondary" onPress={featuredStays.retry} />
        </View>
      ) : featuredStays.stays[category].length === 0 ? (
        <Text variant="body" className="py-8 text-center">
          No stays here yet.
        </Text>
      ) : (
        featuredStays.stays[category].map((p, i) => (
          <FeaturedRow key={p.id} index={filtered ? i : i + 4}>
            <FeaturedCard
              onPress={() => router.push({ pathname: "/stay/[id]", params: { id: p.id, from: "home" } })}
              title={p.title} location={`${p.city}, ${p.state}`} rating={p.rating} imageUrl={p.imageUrl} />
          </FeaturedRow>
        ))
      )}
    </ScrollView>
  );
}

// Own component so each row can memoize its entrance by index (hooks can't run inside .map).
function FeaturedRow({ index, children }: { index: number; children: React.ReactNode }) {
  return <Animated.View entering={useEntering(index)}>{children}</Animated.View>;
}
