import { Image } from "expo-image";
import { useState } from "react";
import { FlatList, View, useWindowDimensions } from "react-native";
import { Text } from "./text";

/** Full-width photo pager with an `n / total` counter pill. Overlay controls are passed as children and sit on top of the photos. */
export function StayGallery({
  imageUrls,
  label,
  children,
}: {
  imageUrls: string[];
  /** Describes the photos for screen readers, e.g. the stay's title. */
  label: string;
  children?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  // Photos are taller than wide in the design (about 6:7).
  const height = Math.round(width * 0.85);

  return (
    <View style={{ height }} className="bg-surface-alt">
      <FlatList
        data={imageUrls}
        keyExtractor={(url) => url}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(Math.min(Math.max(next, 0), imageUrls.length - 1));
        }}
        renderItem={({ item, index: i }) => (
          <Image
            source={{ uri: item }}
            style={{ width, height }}
            contentFit="cover"
            transition={200}
            accessibilityLabel={`${label}, photo ${i + 1} of ${imageUrls.length}`}
          />
        )}
      />
      {children}
      {imageUrls.length > 1 ? (
        <View className="absolute bottom-10 right-5 rounded-full bg-scrim px-4 py-2" pointerEvents="none">
          <Text variant="caption" className="font-jakarta-semibold text-on-scrim">
            {index + 1} / {imageUrls.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
