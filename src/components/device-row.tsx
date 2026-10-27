import { Laptop, Smartphone } from "lucide-react-native";
import { View } from "react-native";
import { Badge } from "./badge";
import { Icon } from "./icon";
import { Text } from "./text";

/** One signed-in device: kind and browser, place, and when it was last active. */
export function DeviceRow({
  label,
  place,
  lastActive,
  current,
  mobile,
}: {
  label: string;
  place?: string | null;
  lastActive: string;
  current?: boolean;
  mobile?: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}${current ? ", this device" : ""}. ${place ? `${place}. ` : ""}${lastActive}`}
      className="flex-row items-center gap-4 py-3"
    >
      <View className="size-11 items-center justify-center rounded-full bg-surface-alt">
        <Icon icon={mobile ? Smartphone : Laptop} size="lg" />
      </View>
      <View className="flex-1 gap-1">
        <Text variant="caption" className="font-jakarta-semibold">
          {label}
        </Text>
        <Text variant="small">{[place, lastActive].filter(Boolean).join(" · ")}</Text>
      </View>
      {current ? <Badge label="This device" size="xs" /> : null}
    </View>
  );
}
