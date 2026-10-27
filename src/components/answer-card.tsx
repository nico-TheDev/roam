import { FileText } from "lucide-react-native";
import { View, ViewProps } from "react-native";
import { cn } from "./cn";
import { Icon } from "./icon";
import { Text } from "./text";

/** One answer to one topic: the text and where it came from. */
export function AnswerCard({
  title,
  text,
  source,
  className,
  ...props
}: ViewProps & { title: string; text: string; source: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`${title}. ${text}. Source: ${source}`}
      className={cn("gap-2 rounded-md bg-secondary-soft p-4", className)}
      style={{ borderCurve: "continuous" }}
      {...props}
    >
      <Text variant="caption" className="font-jakarta-semibold">
        {title}
      </Text>
      <Text variant="body" className="text-ink">
        {text}
      </Text>
      <View className="flex-row items-center gap-1.5 pt-1">
        <Icon icon={FileText} size="sm" className="text-secondary-strong" />
        <Text variant="micro">{source}</Text>
      </View>
    </View>
  );
}
