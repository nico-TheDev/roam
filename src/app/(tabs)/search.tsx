import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Check,
  ChevronDown,
  SearchX,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Keyboard, ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { Alert, Button, Chip, Icon, ListingCard, PressableScale, SearchField, Text } from "@/components";
import { useEntering } from "@/lib/motion";
import { posthog } from "@/lib/posthog";
import { SUGGESTED_QUERIES, parseQuery, removeFilter } from "@/lib/search";
import { useSavedStays } from "@/lib/saved";
import { sortStays } from "@/lib/search-query";
import type { SearchSort } from "@/lib/search-query";
import { useSearchStays } from "@/lib/search-stays";
import type { SearchSource } from "@/lib/search-stays";
import { badges } from "@/lib/stay-badges";

const SORTS: { value: SearchSort; label: string }[] = [
  { value: "best", label: "Best match" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating_desc", label: "Rating: high to low" },
  { value: "rating_asc", label: "Rating: low to high" },
];

export default function Search() {
  const { q, from } = useLocalSearchParams<{ q?: string; from?: string }>();
  // Keyed by the query: a new search (from Home, a suggestion or a removed chip) starts the screen fresh,
  // which resets the box and plays the results entrance once.
  return <SearchScreen key={q ?? ""} query={q ?? ""} initialSource={from === "home" ? "home" : from === "suggestion" ? "suggestion" : from === "filter_removed" ? "filter_removed" : "results"} />;
}

function SearchScreen({ query, initialSource }: { query: string; initialSource: SearchSource }) {
  const router = useRouter();
  const [text, setText] = useState(query);
  const saved = useSavedStays();
  const parsed = useMemo(() => parseQuery(query), [query]);
  const [sort, setSort] = useState<SearchSort>("best");
  const [sortOpen, setSortOpen] = useState(false);
  const search = useSearchStays(query, initialSource);
  // The regex reading draws the chips while loading; once the server answers, its reading wins ("no pets" is not "pets").
  const filters = search.status === "ready" ? search.filters : parsed.filters;
  const stays = useMemo(() => (search.status === "ready" ? sortStays(search.stays, sort) : []), [search, sort]);

  // The source travels in the URL because a new query remounts the screen.
  const run = (next: string, from: SearchSource) => {
    Keyboard.dismiss();
    router.setParams({ q: next.trim(), from });
  };
  const submitSearch = (next: string, from: "results" | "suggestion") => run(next, from);

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="gap-5 pb-8 pt-4"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {saved.error ? (
        <View className="px-5">
          <Alert tone="danger" message={saved.error} onDismiss={saved.dismissError} />
        </View>
      ) : null}

      <View className="px-5">
        <SearchField
          value={text}
          onChangeText={setText}
          onSubmit={() => submitSearch(text, "results")}
          onBack={() => router.navigate("/home")}
          placeholder="Describe your stay"
          trailing={<Icon icon={SlidersHorizontal} size="lg" />}
        />
      </View>

      {!query ? (
        <Suggestions
          onPick={(s) => {
            posthog?.capture("search_suggestion_selected");
            submitSearch(s, "suggestion");
          }}
        />
      ) : (
        <>
          {filters.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="grow-0"
              contentContainerClassName="gap-3 px-5"
              keyboardShouldPersistTaps="handled"
            >
              {filters.map((f) => (
                <Chip
                  key={f.key}
                  label={f.label}
                  selected
                  onPress={() => {
                    posthog?.capture("search_filter_removed", { filter_type: f.key });
                    run(removeFilter(query, f), "filter_removed");
                  }}
                />
              ))}
            </ScrollView>
          ) : null}

          {search.status === "loading" ? (
            <ResultsPlaceholder />
          ) : search.status === "error" ? (
            <View className="gap-3 px-5">
              <Alert
                tone="danger"
                message={search.rateLimited ? "You're searching a lot. Try again in a moment." : "We couldn't load stays. Check your connection and try again."}
              />
              <Button title="Try again" variant="secondary" onPress={search.retry} />
            </View>
          ) : (
            <>
              <View className="z-10">
              <View className="flex-row items-center justify-between px-5">
                <Text variant="body" className="text-ink">
                  {search.total} {search.total === 1 ? "stay" : "stays"}
                </Text>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Sort by ${SORTS.find((o) => o.value === sort)?.label}`}
                  accessibilityState={{ expanded: sortOpen }}
                  onPress={() => setSortOpen((open) => !open)}
                  className="flex-row items-center gap-1"
                >
                  <Text variant="body">
                    Sort by <Text variant="body" className="font-jakarta-bold text-ink">{SORTS.find((o) => o.value === sort)?.label}</Text>
                  </Text>
                  <Icon icon={ChevronDown} size="md" />
                </PressableScale>
              </View>

              {sortOpen ? (
                <View className="absolute right-5 top-full z-10 mt-2 w-60 gap-1 rounded-md bg-surface p-2 shadow-card">
                  {SORTS.map((o) => (
                    <PressableScale
                      key={o.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: o.value === sort }}
                      onPress={() => {
                        setSortOpen(false);
                        if (o.value === sort) return;
                        posthog?.capture("search_sort_changed", { sort: o.value });
                        setSort(o.value);
                      }}
                      className="flex-row items-center gap-3 rounded-sm px-3 py-2"
                    >
                      <Text variant="caption" className="flex-1">
                        {o.label}
                      </Text>
                      {o.value === sort ? <Icon icon={Check} size="sm" /> : null}
                    </PressableScale>
                  ))}
                </View>
              ) : null}
              </View>

              {stays.length === 0 ? (
                <NoMatches hasFilters={filters.length > 0} onClear={() => run("", "results")} />
              ) : (
                <View className="gap-3 px-5">
                  {stays.map((p, i) => (
                    <ResultRow key={p.id} index={i}>
                      <ListingCard
                        onPress={() => router.push({ pathname: "/stay/[id]", params: { id: p.id, from: "search" } })}
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
                    </ResultRow>
                  ))}
                </View>
              )}
            </>
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

function ResultsPlaceholder() {
  return (
    <View className="gap-3 px-5" accessibilityLabel="Loading stays" accessibilityState={{ busy: true }}>
      {[0, 1, 2].map((i) => (
        <View key={i} className="h-36 rounded-lg bg-surface-alt" style={{ borderCurve: "continuous" }} />
      ))}
    </View>
  );
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

function NoMatches({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <Animated.View entering={useEntering(0)} className="items-center gap-3 px-5 pt-8">
      <View className="size-20 items-center justify-center rounded-full bg-surface-alt">
        <Icon icon={SearchX} size="lg" />
      </View>
      <Text variant="heading">No stays match</Text>
      <Text variant="body" className="text-center">
        {hasFilters
          ? "Nothing fits all of those at once. Remove a filter above, or start over."
          : "Nothing matches those words. Try fewer words, or describe the stay another way."}
      </Text>
      <Button title="Clear search" variant="secondary" size="sm" onPress={onClear} />
    </Animated.View>
  );
}
