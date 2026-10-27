import { useLocalSearchParams, useRouter } from "expo-router";
import { Bath, Flame, Laptop, Mountain, PawPrint, Sparkles, SearchX, Waves, Wifi } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Keyboard, ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { Button, Chip, Icon, ListingCard, PressableScale, SearchField, Text } from "@/components";
import type { Amenity, Property } from "@/data/properties";
import { useEntering } from "@/lib/motion";
import { AMENITY_LABELS, SUGGESTED_QUERIES, parseQuery, removeFilter, searchProperties } from "@/lib/search";

const amenityIcons: Record<Amenity, LucideIcon> = {
  "hot-tub": Bath,
  pool: Waves,
  fireplace: Flame,
  "ocean-view": Mountain,
  wifi: Wifi,
  workspace: Laptop,
};

// The two badges on a card: the first amenity, then Pet Friendly when it applies, then the next amenity.
function badges(p: Property) {
  const list = p.amenities.map((a) => ({ label: AMENITY_LABELS[a], icon: amenityIcons[a] }));
  if (p.petFriendly) list.splice(1, 0, { label: "Pet Friendly", icon: PawPrint });
  return list.slice(0, 2).map(({ label, icon }) => ({ label, icon: <Icon icon={icon} size="sm" /> }));
}

export default function Search() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  // Keyed by the query: a new search (from Home, a suggestion or a removed chip) starts the screen fresh,
  // which resets the box and plays the results entrance once.
  return <SearchScreen key={q ?? ""} query={q ?? ""} />;
}

function SearchScreen({ query }: { query: string }) {
  const router = useRouter();
  const [text, setText] = useState(query);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const parsed = useMemo(() => parseQuery(query), [query]);
  const results = useMemo(() => (query ? searchProperties(parsed) : []), [query, parsed]);

  const run = (next: string) => {
    Keyboard.dismiss();
    router.setParams({ q: next.trim() });
  };
  const toggleFavorite = (id: string) =>
    setFavorites((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="gap-5 pb-8 pt-4"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View className="px-5">
        <SearchField
          value={text}
          onChangeText={setText}
          onSubmit={() => run(text)}
          onBack={() => router.navigate("/home")}
          placeholder="Describe your stay"
        />
      </View>

      {!query ? (
        <Suggestions onPick={(s) => run(s)} />
      ) : (
        <>
          {parsed.filters.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="grow-0"
              contentContainerClassName="gap-3 px-5"
              keyboardShouldPersistTaps="handled"
            >
              {parsed.filters.map((f) => (
                <Chip key={f.key} label={f.label} selected onPress={() => run(removeFilter(query, f))} />
              ))}
            </ScrollView>
          ) : null}

          <View className="flex-row items-center justify-between px-5">
            <Text variant="body" className="text-ink">
              {results.length} {results.length === 1 ? "stay" : "stays"}
            </Text>
            <Text variant="body">
              Sort by <Text variant="body" className="font-jakarta-bold text-ink">Best match</Text>
            </Text>
          </View>

          {results.length === 0 ? (
            <NoMatches onClear={() => run("")} />
          ) : (
            <View className="gap-3 px-5">
              {results.map((p, i) => (
                <ResultRow key={p.id} index={i}>
                  <ListingCard
                    title={p.title}
                    location={`${p.city}, ${p.state}`}
                    rating={p.rating}
                    reviews={p.reviews}
                    price={p.price}
                    imageUrl={p.imageUrl}
                    amenities={badges(p)}
                    favorite={favorites.has(p.id)}
                    onToggleFavorite={() => toggleFavorite(p.id)}
                    favoritePlacement="inline"
                  />
                </ResultRow>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

// Own component so each row memoizes its entrance by index (hooks can't run inside .map). Capped, so row 7+ share a delay.
function ResultRow({ index, children }: { index: number; children: React.ReactNode }) {
  return <Animated.View entering={useEntering(index, { stagger: 40 })}>{children}</Animated.View>;
}

function Suggestions({ onPick }: { onPick: (query: string) => void }) {
  return (
    <Animated.View entering={useEntering(0)} className="gap-3 px-5">
      <Text variant="title">Describe your stay</Text>
      <Text variant="body">Try one of these, or type your own sentence above.</Text>
      {SUGGESTED_QUERIES.map((s) => (
        <PressableScale
          key={s}
          accessibilityRole="button"
          accessibilityLabel={`Search ${s}`}
          onPress={() => onPick(s)}
          className="flex-row items-center gap-3 rounded-md bg-secondary-soft p-4"
        >
          <Icon icon={Sparkles} size="lg" className="text-secondary-strong" />
          <Text variant="caption" className="flex-1">
            {s}
          </Text>
        </PressableScale>
      ))}
    </Animated.View>
  );
}

function NoMatches({ onClear }: { onClear: () => void }) {
  return (
    <Animated.View entering={useEntering(0)} className="items-center gap-3 px-5 pt-8">
      <View className="size-20 items-center justify-center rounded-full bg-surface-alt">
        <Icon icon={SearchX} size="lg" />
      </View>
      <Text variant="heading">No stays match</Text>
      <Text variant="body" className="text-center">
        Nothing fits all of those at once. Remove a filter above, or start over.
      </Text>
      <Button title="Clear filters" variant="secondary" size="sm" onPress={onClear} />
    </Animated.View>
  );
}
