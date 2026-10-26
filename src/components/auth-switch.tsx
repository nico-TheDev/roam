import { Link, Href } from "expo-router";
import { View } from "react-native";
import { Text } from "./text";

/** Footer line that swaps between sign up and sign in, e.g. "Already have an account? Sign in". */
export function AuthSwitch({ prompt, action, href }: { prompt: string; action: string; href: Href }) {
  return (
    <View className="flex-row flex-wrap items-center justify-center gap-x-2">
      <Text variant="small">{prompt}</Text>
      <Link href={href} replace accessibilityRole="link">
        <Text variant="caption" className="underline">
          {action}
        </Text>
      </Link>
    </View>
  );
}
