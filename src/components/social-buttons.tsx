import { Apple } from "lucide-react-native";
import { View } from "react-native";
import { Button } from "./button";
import { Icon } from "./icon";
import { Text } from "./text";

export type SocialProvider = "google" | "apple";

/** Placeholder: the multicolor Google logo is not in assets/ yet. */
export function GoogleMark() {
  return (
    <View className="size-6 items-center justify-center rounded-full bg-surface-alt">
      <Text variant="caption">G</Text>
    </View>
  );
}

/** Google and Apple sign in buttons. The Apple mark is a Lucide placeholder until the logo asset is provided. */
export function SocialButtons({
  onPress,
  loading,
  disabled,
}: {
  onPress: (provider: SocialProvider) => void;
  /** Provider whose request is in flight. */
  loading?: SocialProvider | null;
  disabled?: boolean;
}) {
  return (
    <View className="gap-3">
      <Button
        title="Continue with Google"
        variant="secondary"
        icon={<GoogleMark />}
        loading={loading === "google"}
        disabled={disabled && loading !== "google"}
        onPress={() => onPress("google")}
      />
      <Button
        title="Continue with Apple"
        variant="secondary"
        icon={<Icon icon={Apple} size="lg" filled />}
        loading={loading === "apple"}
        disabled={disabled && loading !== "apple"}
        onPress={() => onPress("apple")}
      />
    </View>
  );
}
