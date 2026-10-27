import { DollarSign, X } from "lucide-react-native";
import { View } from "react-native";
import { hostMessage, type CancellationPolicy } from "@/lib/host";
import { AMENITY_OPTIONS, CATEGORY_OPTIONS, CHECK_IN_OPTIONS, CHECK_OUT_OPTIONS, formatTime, STATE_OPTIONS, STAY_LIMITS, type StayErrors } from "@/lib/host-stay-rules";
import type { Draft, SectionKey } from "@/lib/stay-draft";
import { Alert } from "../alert";
import { Button } from "../button";
import { Chip } from "../chip";
import { Icon } from "../icon";
import { PhotoGrid, type GridPhoto } from "../photo-grid";
import { PressableScale } from "../pressable-scale";
import { SegmentedControl } from "../segmented-control";
import { Stepper } from "../stepper";
import { Text } from "../text";
import { TextField } from "../text-field";
import { Toggle } from "../toggle";

// The field groups of a stay, shared by Add a stay (all of them in one scroll) and the stay manager (one at a time).
// They hold no state of their own: the screen owns the draft and decides when errors show.
const L = STAY_LIMITS;

export type PhotoControls = {
  photos: GridPhoto[];
  note: string | null;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onRetry: (key: string) => void;
  onMakeCover: (key: string) => void;
};

export type PolicyOptions = { policies?: CancellationPolicy[]; error?: string; retry: () => void };

type Fields = {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  errors: StayErrors;
  disabled?: boolean;
};

export function Group({ title, hint, error, children }: { title: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text variant="title">{title}</Text>
        {hint ? <Text variant="small">{hint}</Text> : null}
      </View>
      {children}
      {error ? <Text variant="small" className="text-danger">{error}</Text> : null}
    </View>
  );
}

export function StepRow({ label, value, onChange, min, max }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text variant="body" className="flex-1 text-ink">{label}</Text>
      <Stepper label={label} value={value} onChange={onChange} min={min} max={max} />
    </View>
  );
}

export function PhotosFields({ controls, error, disabled }: { controls: PhotoControls; error?: string; disabled?: boolean }) {
  return (
    <Group title="Photos" error={error}>
      <PhotoGrid
        photos={controls.photos}
        min={L.photos.min}
        max={L.photos.max}
        onAdd={controls.onAdd}
        onRemove={controls.onRemove}
        onRetry={controls.onRetry}
        onMakeCover={controls.onMakeCover}
        disabled={disabled}
      />
      {controls.note ? <Text variant="small" className="text-danger">{controls.note}</Text> : null}
    </Group>
  );
}

export function BasicsFields({ draft, onChange, errors }: Fields) {
  return (
    <>
      <Group title="Basics">
        <TextField label="Title" title="Title" value={draft.title} onChangeText={(title) => onChange({ title })} error={errors.title} maxLength={L.title.max} returnKeyType="next" />
        <SegmentedControl options={CATEGORY_OPTIONS.map((c) => ({ key: c.value, label: c.title }))} value={draft.category} onChange={(category) => onChange({ category })} />
        {errors.category ? <Text variant="small" className="text-danger">{errors.category}</Text> : null}
      </Group>
      <Group title="Place">
        <TextField label="City" title="City" value={draft.city} onChangeText={(city) => onChange({ city })} error={errors.city} maxLength={L.city.max} returnKeyType="done" />
        <View className="flex-row flex-wrap gap-2">
          {STATE_OPTIONS.map((s) => (
            <Chip key={s.value} label={s.value} selected={draft.state === s.value} onPress={() => onChange({ state: s.value })} accessibilityLabel={s.title} />
          ))}
        </View>
        {errors.state ? <Text variant="small" className="text-danger">{errors.state}</Text> : null}
      </Group>
    </>
  );
}

export function PricingFields({ draft, onChange, errors }: Fields) {
  return (
    <Group title="Pricing" hint="Whole US dollars.">
      <TextField
        label="Nightly price" title="Nightly price (USD)" leading={<Icon icon={DollarSign} size="lg" />}
        value={draft.price} onChangeText={(price) => onChange({ price })} error={errors.nightlyPrice} keyboardType="number-pad" maxLength={5} returnKeyType="done"
      />
      <TextField
        label="Cleaning fee" title="Cleaning fee (USD)" leading={<Icon icon={DollarSign} size="lg" />}
        value={draft.cleaning} onChangeText={(cleaning) => onChange({ cleaning })} error={errors.cleaningFee} keyboardType="number-pad" maxLength={4} returnKeyType="done"
      />
    </Group>
  );
}

export function SpaceFields({ draft, onChange, errors }: Fields) {
  return (
    <Group title="Space">
      <StepRow label="Guests" value={draft.maxGuests} onChange={(maxGuests) => onChange({ maxGuests })} min={L.maxGuests.min} max={L.maxGuests.max} />
      <StepRow label="Bedrooms (0 = studio)" value={draft.bedrooms} onChange={(bedrooms) => onChange({ bedrooms })} min={L.bedrooms.min} max={L.bedrooms.max} />
      <StepRow label="Beds" value={draft.beds} onChange={(beds) => onChange({ beds })} min={L.beds.min} max={L.beds.max} />
      <StepRow label="Bathrooms" value={draft.baths} onChange={(baths) => onChange({ baths })} min={0} max={L.bathrooms.max - 0.5} />
      <View className="flex-row items-center justify-between">
        <Text variant="body" className="text-ink">Plus a half bath</Text>
        <Toggle label="Plus a half bath" value={draft.halfBath} onValueChange={(halfBath) => onChange({ halfBath })} />
      </View>
      <StepRow label="Minimum nights" value={draft.minNights} onChange={(minNights) => onChange({ minNights })} min={L.minNights.min} max={L.minNights.max} />
      <View className="flex-row items-center justify-between">
        <Text variant="body" className="text-ink">Pets allowed</Text>
        <Toggle label="Pets allowed" value={draft.pets} onValueChange={(pets) => onChange({ pets })} />
      </View>
      {errors.bathrooms ? <Text variant="small" className="text-danger">{errors.bathrooms}</Text> : null}
    </Group>
  );
}

export function TimesFields({ draft, onChange, errors }: Fields) {
  return (
    <>
      <Group title="Check-in" hint="Guests can arrive from this time." error={errors.checkInTime}>
        <View className="flex-row flex-wrap gap-2">
          {CHECK_IN_OPTIONS.map((t) => (
            <Chip key={t} label={formatTime(t)} selected={draft.checkIn === t} onPress={() => onChange({ checkIn: t })} />
          ))}
        </View>
      </Group>
      <Group title="Check-out" hint="Guests leave by this time." error={errors.checkOutTime}>
        <View className="flex-row flex-wrap gap-2">
          {CHECK_OUT_OPTIONS.map((t) => (
            <Chip key={t} label={formatTime(t)} selected={draft.checkOut === t} onPress={() => onChange({ checkOut: t })} />
          ))}
        </View>
      </Group>
    </>
  );
}

export function AmenitiesFields({ draft, onChange, errors }: Fields) {
  const toggle = (value: string) =>
    onChange({ amenities: draft.amenities.includes(value) ? draft.amenities.filter((a) => a !== value) : [...draft.amenities, value] });
  return (
    <Group title="Amenities" hint="The first four you pick are the highlights guests see." error={errors.amenities}>
      <View className="flex-row flex-wrap gap-2">
        {AMENITY_OPTIONS.map((a) => (
          <Chip key={a.value} label={a.title} selected={draft.amenities.includes(a.value)} onPress={() => toggle(a.value)} />
        ))}
      </View>
    </Group>
  );
}

export function NotesFields({ draft, onChange, errors }: Fields) {
  const { notes } = draft;
  return (
    <Group
      title="What it's like"
      hint={`${L.vibeNotes.min} to ${L.vibeNotes.max} plain facts about how the stay feels and what's nearby. Your listing text is written from these, so only say what's true.`}
      error={errors.vibeNotes}
    >
      {notes.map((n, i) => (
        <TextField
          key={i}
          label={`Note ${i + 1}`}
          placeholder="e.g. Quiet road, no neighbors in sight"
          value={n}
          onChangeText={(t) => onChange({ notes: notes.map((x, j) => (j === i ? t : x)) })}
          maxLength={L.vibeNotes.length}
          returnKeyType="done"
          trailing={
            notes.length > L.vibeNotes.min ? (
              <PressableScale accessibilityRole="button" accessibilityLabel={`Remove note ${i + 1}`} onPress={() => onChange({ notes: notes.filter((_, j) => j !== i) })}>
                <Icon icon={X} className="text-muted" />
              </PressableScale>
            ) : undefined
          }
        />
      ))}
      {notes.length < L.vibeNotes.max ? <Button title="Add a note" variant="secondary" onPress={() => onChange({ notes: [...notes, ""] })} /> : null}
    </Group>
  );
}

export function PolicyFields({ draft, onChange, errors, policies }: Fields & { policies: PolicyOptions }) {
  return (
    <Group title="Cancellation" error={errors.cancellationPolicyId}>
      {policies.error ? (
        <View className="gap-3">
          <Alert tone="danger" message={hostMessage(policies.error)} />
          <Button title="Try again" variant="secondary" onPress={policies.retry} />
        </View>
      ) : !policies.policies ? (
        <Text variant="body" accessibilityState={{ busy: true }}>Loading policies…</Text>
      ) : (
        <>
          <View className="flex-row flex-wrap gap-2">
            {policies.policies.map((p) => (
              <Chip key={p.id} label={p.title} selected={draft.policyId === p.id} onPress={() => onChange({ policyId: p.id })} />
            ))}
          </View>
          <Text variant="small">{policies.policies.find((p) => p.id === draft.policyId)?.summary ?? "Choose how guests can cancel."}</Text>
        </>
      )}
    </Group>
  );
}

/** The fields of one manager section. */
export function SectionFields({
  section,
  draft,
  onChange,
  errors,
  photos,
  policies,
}: Fields & { section: SectionKey; photos: PhotoControls; policies: PolicyOptions }) {
  const f = { draft, onChange, errors };
  switch (section) {
    case "photos":
      return <PhotosFields controls={photos} error={errors.photoIds} />;
    case "basics":
      return <BasicsFields {...f} />;
    case "pricing":
      return <PricingFields {...f} />;
    case "space":
      return <SpaceFields {...f} />;
    case "times":
      return <TimesFields {...f} />;
    case "amenities":
      return <AmenitiesFields {...f} />;
    case "notes":
      return <NotesFields {...f} />;
    case "policy":
      return <PolicyFields {...f} policies={policies} />;
  }
}
