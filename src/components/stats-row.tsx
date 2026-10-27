import { Star } from "lucide-react-native";
import { View } from "react-native";
import { useTokenColor } from "@/lib/use-token-color";
import { cn } from "./cn";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

export type Stat = { label: string; value: string; star?: boolean; onPress?: () => void };

/** Bordered box with equal stats split by hairlines. */
export function StatsRow({ stats }: { stats: Stat[] }) {
  const primary = useTokenColor("--color-primary");
  return (
    <View
      className="flex-row rounded-lg border border-border bg-surface py-4"
      style={{ borderCurve: "continuous" }}
    >
      {stats.map((stat, i) => (
        <StatCell key={stat.label} stat={stat} primary={primary} divider={i > 0} />
      ))}
    </View>
  );
}

function StatCell({ stat, primary, divider }: { stat: Stat; primary: string | undefined; divider: boolean }) {
  const content = (
    <>
      <View className="flex-row items-center gap-1">
        {stat.star ? <Icon icon={Star} size="md" fillColor={primary} /> : null}
        <Text variant="title">{stat.value}</Text>
      </View>
      <Text variant="caption" className="text-muted">
        {stat.label}
      </Text>
    </>
  );
  const className = cn("items-center gap-1", divider && "border-l border-border");
  if (stat.onPress) {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${stat.label}: ${stat.value}, open`}
        onPress={stat.onPress}
        wrapperClassName="flex-1"
        className={className}
      >
        {content}
      </PressableScale>
    );
  }
  return (
    <View accessible accessibilityLabel={`${stat.label}: ${stat.value}`} className={cn("flex-1", className)}>
      {content}
    </View>
  );
}
