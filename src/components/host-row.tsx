import { ChevronRight, Medal } from "lucide-react-native";
import { View } from "react-native";
import { Avatar } from "./avatar";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/** "Hosted by" line with the host's photo and either the Superhost badge or the year they started hosting. Tappable when `onPress` is set. */
export function HostRow({
  name,
  photoUrl,
  isSuperhost,
  hostingSince,
  onPress,
}: {
  name: string;
  photoUrl?: string | null;
  isSuperhost?: boolean;
  hostingSince?: number | null;
  onPress?: () => void;
}) {
  const firstName = name.split(" ")[0];
  const content = (
    <View className="flex-row items-center gap-4">
      <Avatar name={name} imageUrl={photoUrl} size="lg" />
      <View className="flex-1 gap-1">
        <Text variant="title-sm">Hosted by {firstName}</Text>
        {isSuperhost ? (
          <View className="flex-row items-center gap-1">
            <Icon icon={Medal} size="sm" className="text-secondary-strong" />
            <Text variant="small">Superhost</Text>
          </View>
        ) : hostingSince ? (
          <Text variant="small">Hosting since {hostingSince}</Text>
        ) : null}
      </View>
      {onPress ? <Icon icon={ChevronRight} size="md" className="text-muted" /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`Host profile, ${name}`} onPress={onPress}>
      {content}
    </PressableScale>
  );
}
