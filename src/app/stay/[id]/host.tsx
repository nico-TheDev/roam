import { useLocalSearchParams, useRouter } from "expo-router";
import { Medal } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { ScrollView, View } from "react-native";
import { Alert, Avatar, Button, Icon, ListingCard, Text } from "@/components";
import { useHostStays } from "@/lib/host-profile";
import { posthog } from "@/lib/posthog";
import { getCachedStay } from "@/lib/stay-details";

// Opened from the stay screen, which has already loaded the stay and its host. The bio shows word for word.
export default function HostProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const host = getCachedStay(id)?.host ?? null;
  const stays = useHostStays(host?.id, id);
  const opened = useRef(false);

  // Once per open, with ids only: never the host's name or bio.
  useEffect(() => {
    if (!host || opened.current) return;
    opened.current = true;
    posthog?.capture("host_profile_opened", { stay_id: id, host_id: host.id });
  }, [host, id]);

  if (!host) {
    return (
      <View className="flex-1 bg-surface px-5 pt-6">
        <Text variant="body">Host details are not available. Open the stay and try again.</Text>
      </View>
    );
  }

  const firstName = host.name.split(" ")[0];
  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="gap-10 px-5 pb-16 pt-10">
      <View className="flex-row items-center gap-4">
        <Avatar name={host.name} imageUrl={host.photoUrl} size="lg" />
        <View className="flex-1 gap-1">
          <Text variant="heading">{host.name}</Text>
          {host.isSuperhost ? (
            <View className="flex-row items-center gap-1">
              <Icon icon={Medal} size="sm" className="text-secondary-strong" />
              <Text variant="small">Superhost</Text>
            </View>
          ) : host.hostingSince ? (
            <Text variant="small">Hosting since {host.hostingSince}</Text>
          ) : null}
        </View>
      </View>

      {host.bio ? (
        <View className="gap-3">
          <Text variant="title">About {firstName}</Text>
          <Text variant="body">{host.bio}</Text>
        </View>
      ) : null}

      {stays.status === "loading" ? (
        <View className="gap-3" accessibilityLabel="Loading stays" accessibilityState={{ busy: true }}>
          <View className="h-6 w-1/2 rounded-sm bg-surface-alt" />
          <View className="h-36 rounded-lg bg-surface-alt" style={{ borderCurve: "continuous" }} />
        </View>
      ) : stays.status === "error" ? (
        <View className="gap-4">
          <Alert tone="danger" message={`We couldn't load more stays by ${firstName}.`} />
          <Button title="Try again" variant="secondary" onPress={stays.retry} />
        </View>
      ) : stays.stays.length > 0 ? (
        <View className="gap-4">
          <Text variant="title">More stays by {firstName}</Text>
          {stays.stays.map((s) => (
            <ListingCard
              key={s.id}
              title={s.title}
              location={`${s.city}, ${s.state}`}
              rating={s.rating}
              reviews={s.reviewCount}
              price={s.nightlyPrice}
              imageUrl={s.imageUrl}
              onPress={() => router.push({ pathname: "/stay/[id]", params: { id: s.id } })}
            />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
