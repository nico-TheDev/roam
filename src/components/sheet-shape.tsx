import { styled } from "nativewind";
import { ComponentProps, useState } from "react";
import { LayoutChangeEvent, Platform, View, ViewProps } from "react-native";
import Svg, { Path } from "react-native-svg";
import { cn } from "./cn";

// Same wrapper idea as Icon: className `text-*` becomes the SVG `color`, which `currentColor` reads.
// react-native-svg drops className on web, so a wrapper View carries the `text-*` class and the SVG inherits it
// through `currentColor`.
function WebThemedSvg({ className, style, ...props }: ComponentProps<typeof Svg>) {
  return (
    <View className={className} style={style} pointerEvents="none">
      <Svg {...props} />
    </View>
  );
}

const ThemedSvg =
  Platform.OS === "web"
    ? WebThemedSvg
    : styled(Svg, {
        className: { target: false, nativeStyleMapping: { color: "color" } },
      });

/** How far the top edge sweeps down from its left corner to its right corner, in points. */
const DROP = 96;

/**
 * Bottom sheet with the onboarding design's lopsided top edge: a small corner on the left,
 * a long slope down, and a large rounded corner on the right. Content goes in `children`;
 * give it top padding of at least the left corner so it clears the edge.
 */
export function SheetShape({ className, style, children, ...props }: ViewProps) {
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setSize({ width: w, height: h });
  };

  // Drawn at the design's 402pt width and stretched with the real width.
  const k = width / 402;
  const d =
    `M0 34 C0 15 15 0 34 0 ` +
    `C130 3 260 18 330 38 ` +
    `C385 54 402 70 402 ${DROP} ` +
    `L402 ${Math.max(height / (k || 1), DROP)} L0 ${Math.max(height / (k || 1), DROP)} Z`;

  return (
    <View className={cn(className)} style={style} onLayout={onLayout} {...props}>
      {width > 0 ? (
        <ThemedSvg
          className="text-surface"
          width={width}
          height={height}
          viewBox={`0 0 402 ${height / k}`}
          preserveAspectRatio="none"
          pointerEvents="none"
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          <Path d={d} fill="currentColor" />
        </ThemedSvg>
      ) : null}
      {children}
    </View>
  );
}
