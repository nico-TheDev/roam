import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { ComponentProps, Ref, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnswerCard, ChatBubble, ChatInput, Chip, Icon, IconButton, Text } from "@/components";
import { answerFor, answersFor, greeting, topics } from "@/lib/ask-samples";
import type { Answer } from "@/lib/ask-samples";
import { useEntering } from "@/lib/motion";
import { getCachedStay } from "@/lib/stay-details";

type ScrollViewInstance = ComponentProps<typeof ScrollView> extends { ref?: Ref<infer T> } ? T : never;

type Turn = { id: number; guest: string; answers: Answer[] };

// Sample chat: replies come from src/lib/ask-samples.ts, no backend yet.
export default function AskAboutStay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const stay = getCachedStay(id);
  const [turns, setTurns] = useState<Turn[]>([]);
  const scroll = useRef<ScrollViewInstance>(null);

  const ask = (guest: string, answers: Answer[]) => {
    setTurns((t) => [...t, { id: t.length, guest, answers }]);
    requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace({ pathname: "/stay/[id]", params: { id } }));

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ paddingTop: insets.top + 8 }}
    >
      <View className="flex-row items-center gap-3 px-5 pb-3">
        <IconButton label="Back" variant="outline" onPress={goBack}>
          <Icon icon={ChevronLeft} size="lg" />
        </IconButton>
        <View className="flex-1">
          <Text variant="title">Ask about this stay</Text>
          {stay ? (
            <Text variant="small" numberOfLines={1}>
              {stay.title}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        ref={scroll}
        className="flex-1"
        contentContainerClassName="gap-4 px-5 py-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text variant="body">{greeting}</Text>
        {turns.map((turn) => (
          <TurnView key={turn.id} turn={turn} />
        ))}
      </ScrollView>

      <View className="gap-3 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-5"
          keyboardShouldPersistTaps="handled"
        >
          {topics.map((t) => (
            <Chip key={t.topic} label={t.label} onPress={() => ask(t.question, [answerFor(t.topic)])} />
          ))}
        </ScrollView>
        <ChatInput className="mx-5" onSend={(text) => ask(text, answersFor(text))} />
      </View>
    </KeyboardAvoidingView>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  const guest = useEntering(0);
  const reply = useEntering(1);
  return (
    <View className="gap-4">
      <Animated.View entering={guest}>
        <ChatBubble text={turn.guest} />
      </Animated.View>
      <Animated.View entering={reply} className="gap-3">
        {turn.answers.map((a) => (
          <AnswerCard key={a.topic} title={a.title} text={a.text} source={a.source} />
        ))}
      </Animated.View>
    </View>
  );
}
