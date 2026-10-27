import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useAuth } from "@clerk/expo";
import { ComponentProps, Ref, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnswerCard, ChatBubble, ChatInput, Chip, Icon, IconButton, Text } from "@/components";
import { AskError, askPolicies, greeting, noMatch, topics } from "@/lib/ask-policies";
import type { Answer } from "@/lib/ask-policies";
import { useEntering } from "@/lib/motion";
import { posthog } from "@/lib/posthog";
import { getCachedStay } from "@/lib/stay-details";

type ScrollViewInstance = ComponentProps<typeof ScrollView> extends { ref?: Ref<infer T> } ? T : never;

type Turn = { id: number; guest: string; source: "chip" | "typed"; status: "pending" | "ready" | "error"; answers: Answer[] };

// Replies come from Roam's policies through /api/ask: DeepSeek picks the entries, the cards show them word for word.
export default function AskAboutStay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const stay = getCachedStay(id);
  const [turns, setTurns] = useState<Turn[]>([]);
  const { getToken } = useAuth();
  const scroll = useRef<ScrollViewInstance>(null);
  const nextId = useRef(0);
  const requests = useRef(new AbortController());

  useEffect(() => {
    const controller = requests.current;
    return () => controller.abort();
  }, []);

  const scrollToEnd = () => requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
  const update = (turnId: number, patch: Partial<Turn>) =>
    setTurns((all) => all.map((t) => (t.id === turnId ? { ...t, ...patch } : t)));

  const run = async (turn: Pick<Turn, "id" | "guest" | "source">) => {
    try {
      const answers = await askPolicies(turn.guest, await getToken(), requests.current.signal);
      update(turn.id, { status: "ready", answers: answers.length ? answers : [noMatch] });
      posthog?.capture("stay_policy_question_asked", {
        source: turn.source,
        outcome: answers.length ? "answered" : "no_match",
        answer_count: answers.length,
      });
    } catch (e) {
      if (requests.current.signal.aborted) return;
      update(turn.id, { status: "error" });
      posthog?.capture("stay_policy_question_asked", {
        source: turn.source,
        outcome: "failed",
        answer_count: 0,
        reason: e instanceof AskError ? e.reason : "network",
      });
    }
    scrollToEnd();
  };

  const ask = (guest: string, source: Turn["source"]) => {
    const turn = { id: nextId.current++, guest, source };
    setTurns((t) => [...t, { ...turn, status: "pending", answers: [] }]);
    scrollToEnd();
    run(turn);
  };

  const retry = (turn: Turn) => {
    update(turn.id, { status: "pending" });
    run(turn);
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
          <TurnView key={turn.id} turn={turn} onRetry={() => retry(turn)} />
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
            <Chip key={t.label} label={t.label} onPress={() => ask(t.question, "chip")} />
          ))}
        </ScrollView>
        <ChatInput className="mx-5" onSend={(text) => ask(text, "typed")} />
      </View>
    </KeyboardAvoidingView>
  );
}

function TurnView({ turn, onRetry }: { turn: Turn; onRetry: () => void }) {
  const guest = useEntering(0);
  const reply = useEntering(1);
  return (
    <View className="gap-4">
      <Animated.View entering={guest}>
        <ChatBubble text={turn.guest} />
      </Animated.View>
      <Animated.View entering={reply} className="gap-3">
        {turn.status === "pending" ? <Text variant="small">Checking the policies…</Text> : null}
        {turn.status === "error" ? (
          <View className="items-start gap-2">
            <Text variant="body">Couldn&apos;t check the policies. Try again.</Text>
            <Chip label="Try again" onPress={onRetry} />
          </View>
        ) : null}
        {turn.answers.map((a) => (
          <AnswerCard key={a.path} title={a.title} text={a.text} source={a.source} />
        ))}
      </Animated.View>
    </View>
  );
}
