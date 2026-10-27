import { ArrowUp, MessageCircle } from "lucide-react-native";
import { useState } from "react";
import { TextInput, View, ViewProps } from "react-native";
import { useTokenColor } from "@/lib/use-token-color";
import { cn } from "./cn";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";

/** Question field with a message icon inside it and a round send button. Clears itself after sending. */
export function ChatInput({
  onSend,
  placeholder = "Ask about this stay",
  className,
  ...props
}: ViewProps & { onSend: (text: string) => void; placeholder?: string }) {
  const [text, setText] = useState("");
  const placeholderColor = useTokenColor("--color-muted");
  const canSend = text.trim().length > 0;

  const send = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <View className={cn("h-14 flex-row items-center gap-3 rounded-full bg-surface-alt pl-4 pr-2", className)} {...props}>
      <Icon icon={MessageCircle} size="lg" />
      <TextInput
        accessibilityLabel="Your question"
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        className="flex-1 py-0 text-body font-jakarta-medium text-ink"
        value={text}
        onChangeText={setText}
        onSubmitEditing={send}
        returnKeyType="send"
        blurOnSubmit={false}
      />
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Send"
        accessibilityState={{ disabled: !canSend }}
        disabled={!canSend}
        onPress={send}
        className={cn("size-10 items-center justify-center rounded-full bg-primary", !canSend && "opacity-40")}
      >
        <Icon icon={ArrowUp} size="md" className="text-on-primary" />
      </PressableScale>
    </View>
  );
}
