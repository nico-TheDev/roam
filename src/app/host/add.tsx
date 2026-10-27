import { usePreventRemove, useRouter } from "expo-router";
import { ChevronLeft, Plus, TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import { Alert as NativeAlert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Alert, AmenitiesFields, BasicsFields, Button, Icon, IconButton, NotesFields, PhotosFields, PolicyFields, PricingFields,
  SpaceFields, Text, TimesFields,
} from "@/components";
import { useCancellationPolicies, useHostActions } from "@/lib/host";
import { type StayErrors, stayErrors } from "@/lib/host-stay-rules";
import { type Draft, emptyDraft, inputFromDraft } from "@/lib/stay-draft";
import { usePhotoPicker } from "@/lib/use-photo-picker";

// Opened from the host dashboard. Photos upload as they are picked; Publish sends the facts, and the server writes
// the listing text from them, checks it, and only then creates the stay. The field groups are shared with the stay manager.
export default function AddStay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createStay } = useHostActions();
  const policies = useCancellationPolicies();
  const picker = usePhotoPicker();

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const change = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const [published, setPublished] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input = inputFromDraft(draft, picker.ids);
  const errors: StayErrors = submitted ? stayErrors(input) : {};

  const onPublish = async () => {
    setSubmitted(true);
    setError(null);
    if (Object.keys(stayErrors(input)).length) {
      setError("Check the highlighted fields.");
      return;
    }
    if (picker.failed) {
      setError("Retry or remove the photos that didn't upload.");
      return;
    }
    setBusy(true);
    const result = await createStay(input);
    setBusy(false);
    if (result.ok) {
      setPublished(true);
      router.back();
    } else setError(result.error);
  };

  // Leaving with anything entered asks first, for the back button and the swipe alike. A published stay skips it.
  const empty = emptyDraft();
  const dirty =
    picker.photos.length > 0 ||
    JSON.stringify({ ...draft, notes: draft.notes.map((n) => n.trim()) }) !== JSON.stringify({ ...empty, notes: empty.notes });
  usePreventRemove(dirty && !published, ({ repeat }) => {
    NativeAlert.alert("Discard this stay?", "What you've entered and your photos will be lost.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => repeat() },
    ]);
  });

  const fields = { draft, onChange: change, errors };

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        contentContainerClassName="gap-8 px-5 pb-8"
        contentContainerStyle={{ paddingTop: insets.top + 8 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-3">
          <IconButton label="Back" variant="outline" onPress={() => (router.canGoBack() ? router.back() : router.replace("/host"))}>
            <Icon icon={ChevronLeft} size="lg" />
          </IconButton>
          <Text variant="heading" className="flex-1">
            Add a stay
          </Text>
        </View>

        <PhotosFields controls={picker} error={errors.photoIds} disabled={busy} />
        <BasicsFields {...fields} />
        <PricingFields {...fields} />
        <SpaceFields {...fields} />
        <TimesFields {...fields} />
        <AmenitiesFields {...fields} />
        <NotesFields {...fields} />
        <PolicyFields {...fields} policies={policies} />
      </ScrollView>

      <View className="gap-3 border-t border-border bg-surface px-5 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        {error ? <Alert tone="danger" message={error} icon={<Icon icon={TriangleAlert} className="text-danger" />} /> : null}
        <Button
          title={busy ? "Writing your listing…" : picker.uploading ? "Uploading photos…" : "Publish stay"}
          loading={busy}
          disabled={busy || picker.uploading}
          onPress={onPublish}
          trailing={busy || picker.uploading ? undefined : <Icon icon={Plus} className="text-ink" />}
        />
      </View>
    </View>
  );
}
