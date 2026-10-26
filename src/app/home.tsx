import { Link } from "expo-router";
import { View } from "react-native";
import { Text } from "@/components";

// Placeholder until the real home screen exists. Onboarding "Skip" lands here.
export default function Index() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-surface px-5">
      <Text variant="heading">roam</Text>
      <Link href="/design-system">
        <Text variant="caption" className="text-ink underline">
          Open the design system
        </Text>
      </Link>
    </View>
  );
}
