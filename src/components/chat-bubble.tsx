import { View, ViewProps } from "react-native";
import { cn } from "./cn";
import { Text } from "./text";

/** A guest message: right aligned, yellow. */
export function ChatBubble({ text, className, ...props }: ViewProps & { text: string }) {
  return (
    <View
      className={cn("max-w-[85%] self-end rounded-lg rounded-br-sm bg-primary px-4 py-3", className)}
      style={{ borderCurve: "continuous" }}
      {...props}
    >
      <Text variant="body" className="text-on-primary">
        {text}
      </Text>
    </View>
  );
}
