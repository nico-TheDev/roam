import { Info } from "lucide-react-native";
import { useEffect } from "react";
import { ScrollView, View } from "react-native";
import { Alert, Icon, Text } from "@/components";
import { DEMO_DETAIL, PRIVACY_SECTIONS } from "@/lib/demo";
import { posthog } from "@/lib/posthog";

// Opened from Profile > Preferences. Static text; the same summary is on the landing site at /privacy.
export default function Privacy() {
  useEffect(() => {
    posthog?.capture("privacy_opened");
  }, []);

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="gap-6 px-5 pb-10 pt-6">
      <Text variant="heading">Privacy</Text>
      <Alert tone="success" message={DEMO_DETAIL} icon={<Icon icon={Info} className="text-ink" />} />
      {PRIVACY_SECTIONS.map((s) => (
        <View key={s.title} className="gap-2">
          <Text variant="title">{s.title}</Text>
          <Text variant="body">{s.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
