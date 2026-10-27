import { ArrowUpRight, ChevronLeft, Search, Sparkles } from "lucide-react-native";
import { ComponentRef, Ref } from "react";
import { TextInput, TextInputProps, View } from "react-native";
import { useTokenColor } from "@/lib/use-token-color";
import { cn } from "./cn";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";
import { PressableScale } from "./pressable-scale";

export type SearchInputRef = ComponentRef<typeof TextInput>;

type Props = Omit<TextInputProps, "onSubmitEditing" | "value" | "onChangeText"> & {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  inputRef?: Ref<SearchInputRef>;
};

/** Home prompt bar: a lavender pill you type a sentence into, with a white arrow that runs it. */
export function SearchPill({ value, onChangeText, onSubmit, inputRef, className, ...props }: Props) {
  const placeholderColor = useTokenColor("--color-ink");
  return (
    <View className={cn("h-15 flex-row items-center gap-3 rounded-full bg-secondary pl-5 pr-2", className)}>
      <Icon icon={Sparkles} size="lg" />
      <TextInput
        ref={inputRef}
        accessibilityLabel="Describe your stay"
        placeholderTextColor={placeholderColor}
        className="flex-1 py-0 text-caption text-ink"
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoCorrect={false}
        {...props}
      />
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Search"
        onPress={onSubmit}
        className="size-12 items-center justify-center rounded-full bg-surface"
      >
        <Icon icon={ArrowUpRight} size="lg" />
      </PressableScale>
    </View>
  );
}

/** Results-screen bar: back button, then a grey field with a magnifier. */
export function SearchField({
  value,
  onChangeText,
  onSubmit,
  onBack,
  inputRef,
  className,
  ...props
}: Props & { onBack: () => void }) {
  const placeholderColor = useTokenColor("--color-muted");
  return (
    <View className={cn("flex-row items-center gap-3", className)}>
      <IconButton label="Back" onPress={onBack}>
        <Icon icon={ChevronLeft} size="lg" />
      </IconButton>
      <View className="h-14 flex-1 flex-row items-center gap-3 rounded-full bg-surface-alt px-4">
        <Icon icon={Search} size="lg" />
        <TextInput
          ref={inputRef}
          accessibilityLabel="Search stays"
          placeholderTextColor={placeholderColor}
          className="flex-1 py-0 text-body font-jakarta-medium text-ink"
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
          {...props}
        />
      </View>
    </View>
  );
}
