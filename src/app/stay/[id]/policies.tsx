import { useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { Text } from "@/components";
import { getCachedStay, sheetPolicies } from "@/lib/stay-details";

// Opened from the stay screen, which has already loaded the stay. Every policy shows its text word for word.
export default function StayPolicies() {
  const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
  const stay = getCachedStay(id);
  const policies = stay ? sheetPolicies(stay) : [];
  // Cancellation is the last entry; when asked for, it comes first so the guest sees it without scrolling.
  const ordered =
    focus === "cancellation"
      ? [...policies.filter((p) => p.kind === "cancellation"), ...policies.filter((p) => p.kind !== "cancellation")]
      : policies;

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="gap-6 px-5 pb-10 pt-6">
      <Text variant="heading">Policies</Text>
      {ordered.length === 0 ? (
        <Text variant="body">This stay has no policies listed yet. Contact Roam support if you have a question.</Text>
      ) : (
        ordered.map((p) => (
          <View key={p.kind + p.title} className="gap-2">
            <Text variant="title">{p.title}</Text>
            <Text variant="body">{p.body}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
