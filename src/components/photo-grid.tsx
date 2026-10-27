import { Image } from "expo-image";
import { ImagePlus, RotateCw, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

export type GridPhoto = {
  key: string;
  uri: string;
  status: "uploading" | "done" | "failed";
  /** Sanity asset id once uploaded. */
  assetId?: string;
};

/**
 * The photos of a stay being added: a 3-column grid with an add tile. The first photo is the cover.
 * Each tile shows its own upload state; a failed one offers a retry.
 */
export function PhotoGrid({
  photos,
  min,
  max,
  onAdd,
  onRemove,
  onRetry,
  onMakeCover,
  disabled,
}: {
  photos: GridPhoto[];
  min: number;
  max: number;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onRetry: (key: string) => void;
  onMakeCover: (key: string) => void;
  disabled?: boolean;
}) {
  const remaining = Math.max(0, min - photos.length);
  // Three square columns with the grid's 8 px gap. Measured, because percentage widths plus an aspect ratio
  // collapsed to zero height for tiles with no in-flow content.
  const [width, setWidth] = useState(0);
  const size = width > 0 ? Math.floor((width - 16) / 3) : 0;
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {photos.map((p, i) => (
          <View key={p.key} className="overflow-hidden rounded-md bg-surface-alt" style={{ width: size, height: size, borderCurve: "continuous" }}>
            <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={`Photo ${i + 1}`} />
            {p.status === "uploading" ? (
              <View className="absolute inset-0 items-center justify-center bg-scrim" accessibilityLabel="Uploading" accessibilityState={{ busy: true }}>
                <ActivityIndicator />
              </View>
            ) : null}
            {p.status === "failed" ? (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`Retry photo ${i + 1}`}
                onPress={() => onRetry(p.key)}
                wrapperClassName="absolute inset-0"
                className="flex-1 items-center justify-center gap-1 bg-scrim"
              >
                <Icon icon={RotateCw} className="text-on-scrim" />
                <Text variant="micro" className="text-on-scrim">
                  Retry
                </Text>
              </PressableScale>
            ) : null}
            {i === 0 ? (
              <View className="absolute bottom-1.5 left-1.5 rounded-full bg-scrim px-2 py-0.5">
                <Text variant="micro" className="text-on-scrim">
                  Cover
                </Text>
              </View>
            ) : (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`Make photo ${i + 1} the cover`}
                disabled={disabled || p.status !== "done"}
                onPress={() => onMakeCover(p.key)}
                wrapperClassName="absolute bottom-1.5 left-1.5"
                className="rounded-full bg-scrim px-2 py-0.5"
              >
                <Text variant="micro" className="text-on-scrim">
                  Make cover
                </Text>
              </PressableScale>
            )}
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Remove photo ${i + 1}`}
              disabled={disabled}
              onPress={() => onRemove(p.key)}
              wrapperClassName="absolute right-1.5 top-1.5"
              className="size-7 items-center justify-center rounded-full bg-scrim"
            >
              <Icon icon={X} size="sm" className="text-on-scrim" />
            </PressableScale>
          </View>
        ))}
        {photos.length < max ? (
          <View style={{ width: size, height: size }}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Add photos"
              disabled={disabled}
              onPress={onAdd}
              wrapperClassName="flex-1"
              className="flex-1 items-center justify-center gap-1 rounded-md border border-dashed border-border bg-surface-alt"
            >
              <Icon icon={ImagePlus} size="lg" />
              <Text variant="micro">Add photos</Text>
            </PressableScale>
          </View>
        ) : null}
      </View>
      <Text variant="small">
        {photos.length} / {max}
        {remaining > 0 ? ` · add at least ${remaining} more` : ""}. The first photo is the cover.
      </Text>
    </View>
  );
}
