import { useRouter } from "expo-router";
import { ChevronLeft, House, Plus } from "lucide-react-native";
import { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Alert, Button, HostStayCard, Icon, IconButton, StatsRow, Text } from "@/components";
import { bookingPhase } from "@/lib/booking-rules";
import { formatStayDates } from "@/lib/bookings";
import { hostMessage, refreshHost, useHost, useHostActions, useHostBookings } from "@/lib/host";
import { useEntering } from "@/lib/motion";

// Opened from the Hosting row on Profile. The stays this user hosts with their status and next booking; a card opens
// the stay manager and the switch pauses or resumes a stay.
export default function HostDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const host = useHost();
  const bookings = useHostBookings();
  const { setListed } = useHostActions();
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/profile"));
  const onRefresh = () => {
    setRefreshing(true);
    refreshHost();
    setTimeout(() => setRefreshing(false), 800);
  };
  const toggle = async (stayId: string, listed: boolean) => {
    setNotice(null);
    const result = await setListed(stayId, listed);
    if (!result.ok) setNotice(result.error);
  };

  const upcoming = bookings.status === "ready" ? bookings.bookings : [];
  const nextFor = (stayId: string) => upcoming.find((b) => b.stayId === stayId);

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="gap-5 px-5 pb-8"
      contentContainerStyle={{ paddingTop: insets.top + 8 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="flex-row items-center gap-3">
        <IconButton label="Back" variant="outline" onPress={goBack}>
          <Icon icon={ChevronLeft} size="lg" />
        </IconButton>
        <Text variant="heading" className="flex-1">
          Hosting
        </Text>
        <IconButton label="Add a stay" onPress={() => router.push("/host/add")}>
          <Icon icon={Plus} size="lg" />
        </IconButton>
      </View>

      {host.status === "loading" ? (
        <View className="gap-3" accessibilityLabel="Loading your stays" accessibilityState={{ busy: true }}>
          {[0, 1].map((i) => (
            <View key={i} className="h-36 rounded-lg bg-surface-alt" style={{ borderCurve: "continuous" }} />
          ))}
        </View>
      ) : host.status === "error" ? (
        <View className="gap-3">
          <Alert tone="danger" message={hostMessage(host.reason)} />
          <Button title="Try again" variant="secondary" onPress={host.retry} />
        </View>
      ) : host.stays.length === 0 ? (
        <Empty onAdd={() => router.push("/host/add")} />
      ) : (
        <>
          <StatsRow
            stats={[
              { label: "Stays", value: String(host.stays.length) },
              { label: "Listed", value: String(host.stays.filter((s) => s.listed).length) },
              { label: "Booked", value: bookings.status === "ready" ? String(upcoming.length) : "–" },
            ]}
          />
          {notice ? <Alert tone="danger" message={notice} onDismiss={() => setNotice(null)} /> : null}
          {bookings.status === "error" ? (
            <View className="gap-3">
              <Alert tone="danger" message="We couldn't load your bookings." />
              <Button title="Try again" variant="secondary" onPress={bookings.retry} />
            </View>
          ) : null}
          <View className="gap-3">
            {host.stays.map((s, i) => {
              const next = nextFor(s.id);
              return (
                <Row key={s.id} index={i}>
                  <HostStayCard
                    onPress={() => router.push({ pathname: "/host/stay/[id]", params: { id: s.id } })}
                    title={s.title}
                    location={`${s.city}, ${s.state}`}
                    price={s.nightlyPrice}
                    imageUrl={s.imageUrl}
                    listed={s.listed}
                    nextBooking={
                      bookings.status !== "ready"
                        ? "Checking bookings…"
                        : next
                          ? `${{ upcoming: "", staying: "Staying now · ", leaving: "Leaves today · " }[bookingPhase(next.checkIn, next.checkOut)]}${formatStayDates(next.checkIn, next.checkOut)} · ${next.guests} ${next.guests === 1 ? "guest" : "guests"}`
                          : null
                    }
                    onToggleListed={(listed) => toggle(s.id, listed)}
                  />
                </Row>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Row({ index, children }: { index: number; children: React.ReactNode }) {
  return <Animated.View entering={useEntering(index, { stagger: 40 })}>{children}</Animated.View>;
}

function Empty({ onAdd }: { onAdd: () => void }) {
  return (
    <Animated.View entering={useEntering(0)} className="items-center gap-3 pt-16">
      <View className="size-20 items-center justify-center rounded-full bg-surface-alt">
        <Icon icon={House} size="lg" />
      </View>
      <Text variant="heading">No stays yet</Text>
      <Text variant="body" className="text-center">
        Stays you host show up here. Add your first one with a few photos and a short description of what it&apos;s like.
      </Text>
      <Button title="Add a stay" onPress={onAdd} />
    </Animated.View>
  );
}
