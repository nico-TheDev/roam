import { useRouter } from "expo-router";
import { House, TriangleAlert } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Alert, Button, Icon, Text } from "@/components";
import { useHostActions } from "@/lib/host";
import { posthog } from "@/lib/posthog";

// Opened from "Become a host" on Profile. One tap creates the public host profile; sign-in and guest features don't change.
export default function StartHosting() {
  const router = useRouter();
  const { becomeHost } = useHostActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    posthog?.capture("host_intro_viewed");
  }, []);

  const onStart = async () => {
    setBusy(true);
    setError(null);
    const result = await becomeHost();
    setBusy(false);
    if (result.ok) router.replace("/host");
    else setError(result.error);
  };

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="gap-6 px-5 pb-10 pt-6">
      <View className="size-14 items-center justify-center rounded-full bg-surface-alt">
        <Icon icon={House} size="lg" />
      </View>
      <View className="gap-2">
        <Text variant="heading">Host on Roam</Text>
        <Text variant="body">
          Create your host profile to manage the stays you host. Guests see your first name and the year you started hosting.
        </Text>
      </View>

      {error ? <Alert tone="danger" message={error} icon={<Icon icon={TriangleAlert} className="text-danger" />} /> : null}

      <Button title={error ? "Try again" : "Become a host"} loading={busy} onPress={onStart} />
    </ScrollView>
  );
}
