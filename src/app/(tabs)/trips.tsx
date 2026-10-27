import { CalendarDays } from "lucide-react-native";
import { View } from "react-native";
import { Icon, Text } from "@/components";

// Placeholder until bookings exist.
export default function Trips() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-surface px-5">
      <View className="size-20 items-center justify-center rounded-full bg-surface-alt">
        <Icon icon={CalendarDays} size="lg" />
      </View>
      <Text variant="heading">No trips yet</Text>
      <Text variant="body" className="text-center">
        Stays you book will show up here.
      </Text>
    </View>
  );
}
