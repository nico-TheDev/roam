import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";
import { Text } from "./text";
import { Wordmark } from "./wordmark";

/** Shared layout for sign up, verification and sign in: back button, wordmark, heading, then the form. */
export function AuthScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="gap-8 px-5"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View className="flex-row items-center justify-between">
        <IconButton label="Back" size="sm" variant="outline" onPress={() => router.back()}>
          <Icon icon={ChevronLeft} size="lg" />
        </IconButton>
        <Wordmark size="xs" tagline={false} />
      </View>
      <View className="gap-3">
        <Text variant="headline-sm" accessibilityRole="header">
          {title}
        </Text>
        <Text className="pr-20">{subtitle}</Text>
      </View>
      {children}
    </ScrollView>
  );
}
