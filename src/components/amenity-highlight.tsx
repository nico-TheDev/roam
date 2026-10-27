import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { Icon } from "./icon";
import { Text } from "./text";

/** Icon over a short label, used in a row of four stay highlights. */
export function AmenityHighlight({ icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <View accessible accessibilityLabel={label} className="flex-1 items-center gap-2">
      <Icon icon={icon} size="lg" />
      <Text variant="small" className="text-center text-ink">
        {label}
      </Text>
    </View>
  );
}
