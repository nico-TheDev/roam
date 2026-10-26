import { Pressable, View, ViewProps } from "react-native";
import { cn } from "./cn";
import { Text } from "./text";

const tones = { success: "bg-success-soft", danger: "bg-danger-soft" } as const;

export function Alert({
  message,
  tone = "success",
  icon,
  dismissIcon,
  onDismiss,
  className,
  ...props
}: ViewProps & {
  message: string;
  tone?: keyof typeof tones;
  icon?: React.ReactNode;
  dismissIcon?: React.ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <View
      accessibilityRole="alert"
      className={cn(
        "min-h-14 flex-row items-center gap-3 rounded-md px-4 py-3",
        tones[tone],
        className,
      )}
      style={{ borderCurve: "continuous" }}
      {...props}
    >
      {icon}
      <Text variant="small" className="flex-1 text-ink">
        {message}
      </Text>
      {onDismiss ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onDismiss}>
          {dismissIcon}
        </Pressable>
      ) : null}
    </View>
  );
}
