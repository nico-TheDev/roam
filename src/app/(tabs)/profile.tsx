import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { Bell, Briefcase, CalendarDays, CircleHelp, CreditCard, FileText, House, Info, Lock, Settings, User } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import {
  Avatar,
  Alert,
  Badge,
  Icon,
  IconButton,
  PolicyCard,
  ProfileRow,
  ProfileSection,
  StatsRow,
  Surface,
  Text,
  Wordmark,
} from "@/components";
import { DEMO_DETAIL } from "@/lib/demo";
import { useHost } from "@/lib/host";
import { useEntering } from "@/lib/motion";
import { useBookings } from "@/lib/bookings";
import { useSavedStays } from "@/lib/saved";

// Ratings have no data source yet, so that stat shows an honest empty value.
export default function Profile() {
  const router = useRouter();
  const { user } = useUser();
  const saved = useSavedStays();
  const trips = useBookings().state;
  const host = useHost();
  const name = user?.fullName ?? user?.firstName ?? "Guest";
  const memberSince = user?.createdAt?.toLocaleDateString(undefined, { month: "short", year: "numeric" });

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="gap-4 px-5 pb-8 pt-4"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Animated.View entering={useEntering(0)} className="flex-row items-center justify-between">
        <Wordmark size="sm" tagline={false} />
        <IconButton label="Settings" size="sm" onPress={() => router.push("/account/settings")}>
          <Icon icon={Settings} size="lg" />
        </IconButton>
      </Animated.View>

      <Animated.View entering={useEntering(1)}>
        <Surface variant="flat" className="flex-row items-center gap-4">
          <Avatar name={name} imageUrl={user?.imageUrl} size="lg" />
          <View className="flex-1 gap-1">
            <Text variant="heading" numberOfLines={1}>
              {name}
            </Text>
            {user?.primaryEmailAddress ? (
              <Text variant="body" numberOfLines={1}>
                {user.primaryEmailAddress.emailAddress}
              </Text>
            ) : null}
            {memberSince ? (
              <Badge
                label={`Member since ${memberSince}`}
                tone="info"
                size="sm"
                icon={<Icon icon={CalendarDays} size="sm" />}
                className="mt-1"
              />
            ) : null}
          </View>
        </Surface>
      </Animated.View>

      <Animated.View entering={useEntering(2)}>
        <StatsRow
          stats={[
            { label: "Trips", value: trips.status === "ready" ? String(trips.data.length) : "–" },
            { label: "Saved", value: String(saved.count), onPress: () => router.push("/saved") },
            { label: "Rating", value: "–", star: true },
          ]}
        />
      </Animated.View>

      <Animated.View entering={useEntering(3)}>
        <ProfileSection title="Account">
          <ProfileRow
            icon={<Icon icon={User} size="lg" />}
            label="Personal info"
            onPress={() => router.push("/account/personal")}
          />
          <ProfileRow icon={<Icon icon={CreditCard} size="lg" />} label="Payment methods" detail="Coming soon" disabled />
          <ProfileRow
            icon={<Icon icon={Briefcase} size="lg" />}
            label="Trips"
            onPress={() => router.navigate("/trips")}
          />
          {host.status === "ready" ? (
            <ProfileRow
              icon={<Icon icon={House} size="lg" />}
              label={host.isHost ? "Host dashboard" : "Become a host"}
              onPress={() => router.push(host.isHost ? "/host" : "/host/start")}
            />
          ) : (
            <ProfileRow
              icon={<Icon icon={House} size="lg" />}
              label="Hosting"
              detail={host.status === "error" ? "Tap to retry" : "Loading"}
              disabled={host.status === "loading"}
              onPress={host.status === "error" ? host.retry : undefined}
            />
          )}
        </ProfileSection>
      </Animated.View>

      <Animated.View entering={useEntering(4)}>
        <ProfileSection title="Preferences">
          <ProfileRow icon={<Icon icon={Bell} size="lg" />} label="Notifications" detail="Coming soon" disabled />
          <ProfileRow icon={<Icon icon={CircleHelp} size="lg" />} label="Help & support" detail="Coming soon" disabled />
          <ProfileRow
            icon={<Icon icon={Lock} size="lg" />}
            label="Privacy"
            onPress={() => router.push("/account/privacy")}
          />
        </ProfileSection>
      </Animated.View>

      <Animated.View entering={useEntering(5)}>
        <Alert tone="success" message={DEMO_DETAIL} icon={<Icon icon={Info} className="text-ink" />} />
      </Animated.View>

      <Animated.View entering={useEntering(6)}>
        <PolicyCard
          icon={<Icon icon={FileText} size="lg" className="text-secondary-strong" />}
          title="Free cancellation"
          description="Full refund up to 7 days before check-in."
          disabled
        />
      </Animated.View>
    </ScrollView>
  );
}
