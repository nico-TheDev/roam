import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Eye, TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Alert, Badge, Button, HostBookingRow, Icon, IconButton, SectionFields, Surface, Text, Toggle } from "@/components";
import type { GridPhoto } from "@/components";
import {
  hostMessage, needsAttention, type StayDetail, useCancellationPolicies, useHostActions, useHostBookings, useHostStay,
} from "@/lib/host";
import { AMENITY_OPTIONS, CATEGORY_OPTIONS, formatTime, type StayErrors, stayErrors } from "@/lib/host-stay-rules";
import { type Draft, draftFromDetail, inputFromDraft, SECTIONS, type SectionKey } from "@/lib/stay-draft";
import { nightsBetween } from "@/lib/calendar";
import { usePhotoPicker } from "@/lib/use-photo-picker";

// Opened from a card on the host overview. Status, upcoming bookings and every detail of one stay. A detail opens
// into its fields, saves on its own, and the server checks ownership and every limit again.
const REWRITES: SectionKey[] = ["basics", "space", "times", "amenities", "notes"];

export default function StayManager() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const state = useHostStay(id);

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="gap-6 px-5 pb-10"
      contentContainerStyle={{ paddingTop: insets.top + 8 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center gap-3">
        <IconButton label="Back" variant="outline" onPress={() => (router.canGoBack() ? router.back() : router.replace("/host"))}>
          <Icon icon={ChevronLeft} size="lg" />
        </IconButton>
        <Text variant="heading" className="flex-1" numberOfLines={1}>
          {state.status === "ready" ? (state.stay.title ?? "Your stay") : "Your stay"}
        </Text>
        <IconButton label="View as a guest" variant="outline" onPress={() => router.push({ pathname: "/stay/[id]", params: { id } })}>
          <Icon icon={Eye} size="lg" />
        </IconButton>
      </View>

      {state.status === "loading" ? (
        <View className="gap-3" accessibilityLabel="Loading your stay" accessibilityState={{ busy: true }}>
          {[0, 1, 2].map((i) => (
            <View key={i} className="h-24 rounded-lg bg-surface-alt" style={{ borderCurve: "continuous" }} />
          ))}
        </View>
      ) : state.status === "error" ? (
        <View className="gap-3">
          <Alert tone="danger" message={hostMessage(state.reason)} />
          <Button title="Try again" variant="secondary" onPress={state.retry} />
        </View>
      ) : (
        <Manager stay={state.stay} />
      )}
    </ScrollView>
  );
}

function Manager({ stay }: { stay: StayDetail }) {
  const { updateStay, setListed } = useHostActions();
  const bookings = useHostBookings();
  const policies = useCancellationPolicies();
  const picker = usePhotoPicker();

  const [listed, setListedLocal] = useState(stay.listed);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [editing, setEditing] = useState<SectionKey | null>(null);
  const [draft, setDraft] = useState<Draft>(() => draftFromDetail(stay));
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<string[]>([]);

  const attention = new Set<string>([...needsAttention(stay), ...flagged]);
  const mine = bookings.status === "ready" ? bookings.bookings.filter((b) => b.stayId === stay.id) : [];

  const onToggle = async (next: boolean) => {
    setListedLocal(next);
    setStatusError(null);
    const result = await setListed(stay.id, next);
    if (!result.ok) {
      setListedLocal(!next);
      setStatusError(result.error);
    }
  };

  const open = (section: SectionKey) => {
    setDraft(draftFromDetail(stay));
    picker.reset((stay.photoIds ?? []).map((assetId, i): GridPhoto => ({ key: assetId, uri: stay.photoUrls[i] ?? "", status: "done", assetId })));
    setSubmitted(false);
    setError(null);
    setEditing(section);
  };

  const input = inputFromDraft(draft, picker.ids);
  const fieldsOf = editing ? SECTIONS[editing].fields : [];
  const allErrors = stayErrors(input);
  const errors: StayErrors = submitted ? Object.fromEntries(Object.entries(allErrors).filter(([k]) => (fieldsOf as readonly string[]).includes(k))) : {};

  const onSave = async () => {
    if (!editing) return;
    setSubmitted(true);
    setError(null);
    if (fieldsOf.some((f) => f in allErrors)) {
      setError("Check the highlighted fields.");
      return;
    }
    if (picker.failed) {
      setError("Retry or remove the photos that didn't upload.");
      return;
    }
    const changes = Object.fromEntries(fieldsOf.map((f) => [f, input[f]]));
    setBusy(true);
    const result = await updateStay(stay.id, changes);
    setBusy(false);
    if (result.ok) {
      setFlagged((f) => f.filter((x) => !(fieldsOf as readonly string[]).includes(x)));
      setEditing(null);
    } else {
      if (result.fields?.length) setFlagged(result.fields);
      setError(result.error);
    }
  };

  const summary = summaries(stay, policies.policies?.find((p) => p.id === stay.cancellationPolicyId)?.title);

  return (
    <>
      <Section title="Status">
        <Surface className="gap-3">
          <View className="flex-row items-center gap-3">
            <Badge label={listed ? "Listed" : "Paused"} tone={listed ? "success" : "neutral"} size="sm" />
            <View className="flex-1" />
            <Toggle label="Listed" value={listed} onValueChange={onToggle} />
          </View>
          <Text variant="small">
            {listed
              ? "Guests can find and book this stay."
              : "Hidden from Home and Search, and it can't be booked. Bookings you already have stay as they are."}
          </Text>
          {statusError ? <Alert tone="danger" message={statusError} /> : null}
        </Surface>
      </Section>

      <Section title="Bookings">
        {bookings.status === "loading" ? (
          <Text variant="body" accessibilityState={{ busy: true }}>Loading…</Text>
        ) : bookings.status === "error" ? (
          <View className="gap-3">
            <Alert tone="danger" message="We couldn't load your bookings." />
            <Button title="Try again" variant="secondary" onPress={bookings.retry} />
          </View>
        ) : mine.length === 0 ? (
          <Text variant="body">No current or upcoming bookings.</Text>
        ) : (
          <View className="gap-3">
            {mine.map((b) => (
              <HostBookingRow key={b.id} checkIn={b.checkIn} checkOut={b.checkOut} nights={nightsBetween(b.checkIn, b.checkOut)} guests={b.guests} amountCents={b.amountCents} />
            ))}
          </View>
        )}
      </Section>

      <Section title="Details">
        <View className="gap-3">
          {(Object.keys(SECTIONS) as SectionKey[]).map((key) => {
            const isOpen = editing === key;
            const needs = SECTIONS[key].fields.some((f) => attention.has(f));
            return (
              <Surface key={key} className="gap-3">
                <View className="flex-row items-center gap-3">
                  <Text variant="title-sm" className="flex-1">{SECTIONS[key].title}</Text>
                  {needs ? <Badge label="Needs attention" tone="danger" size="xs" /> : null}
                  {!isOpen ? (
                    <Button title="Edit" variant="secondary" disabled={editing !== null} onPress={() => open(key)} />
                  ) : null}
                </View>
                {isOpen ? (
                  <>
                    <SectionFields
                      section={key}
                      draft={draft}
                      onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
                      errors={errors}
                      photos={picker}
                      policies={policies}
                    />
                    {error ? <Alert tone="danger" message={error} icon={<Icon icon={TriangleAlert} className="text-danger" />} /> : null}
                    <View className="flex-row gap-3">
                      <Button title="Cancel" variant="secondary" disabled={busy} onPress={() => setEditing(null)} className="flex-1" />
                      <Button
                        title={busy ? (REWRITES.includes(key) ? "Writing your listing…" : "Saving…") : picker.uploading ? "Uploading…" : "Save"}
                        loading={busy}
                        disabled={busy || picker.uploading}
                        onPress={onSave}
                        className="flex-1"
                      />
                    </View>
                  </>
                ) : (
                  <Text variant="small">{summary[key]}</Text>
                )}
              </Surface>
            );
          })}
        </View>
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Text variant="title">{title}</Text>
      {children}
    </View>
  );
}

const MISSING = "Not set yet.";

function summaries(s: StayDetail, policyTitle: string | undefined): Record<SectionKey, string> {
  const category = CATEGORY_OPTIONS.find((c) => c.value === s.category)?.title;
  const amenities = (s.amenities ?? []).map((a) => AMENITY_OPTIONS.find((o) => o.value === a)?.title ?? a);
  return {
    photos: s.photoIds ? `${s.photoIds.length} ${s.photoIds.length === 1 ? "photo" : "photos"}. The first is the cover.` : MISSING,
    basics: s.title ? `${s.title}${category ? ` · ${category}` : ""}${s.city ? ` · ${s.city}, ${s.state}` : ""}` : MISSING,
    pricing: s.nightlyPrice === null ? MISSING : `$${s.nightlyPrice} / night · $${s.cleaningFee ?? 0} cleaning fee`,
    space:
      s.maxGuests === null
        ? MISSING
        : `${s.maxGuests} guests · ${s.bedrooms ?? 0} bedrooms · ${s.beds ?? 0} beds · ${s.bathrooms ?? 0} baths · ${s.minNights ?? 1} min nights · pets ${s.petsAllowed ? "allowed" : "not allowed"}`,
    times: s.checkInTime && s.checkOutTime ? `Check-in from ${formatTime(s.checkInTime)} · check-out by ${formatTime(s.checkOutTime)}` : MISSING,
    amenities: amenities.length ? amenities.join(", ") : MISSING,
    notes: s.vibeNotes?.length ? s.vibeNotes.join(" · ") : MISSING,
    policy: policyTitle ?? (s.cancellationPolicyId ? "Loading…" : MISSING),
  };
}
