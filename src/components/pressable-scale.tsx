import { useState } from "react";
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import Animated, { cubicBezier, useReducedMotion } from "react-native-reanimated";
import { cn } from "./cn";

const ease = cubicBezier(0.23, 1, 0.32, 1);

// NativeWind's style typing rejects Reanimated's easing object, which the runtime accepts (per the Reanimated docs).
const base: StyleProp<ViewStyle> = {
  transform: [{ scale: 1 }],
  transitionProperty: ["transform", "backgroundColor"],
  transitionDuration: ["120ms", "150ms"],
  transitionTimingFunction: [ease, ease],
} as unknown as ViewStyle;

/**
 * Press feedback for anything tappable: 3% scale in 120 ms on press-in, committed on press-out.
 * `className` styles the visible (scaling) view; `wrapperClassName` positions it in its parent.
 * Background color changes also ease in 150 ms, so selected states don't snap. With Reduce Motion
 * on, the scale is dropped and only the color change remains.
 */
export function PressableScale({
  className,
  wrapperClassName,
  children,
  hitSlop = 8,
  ...props
}: Omit<PressableProps, "children" | "style"> & {
  className?: string;
  wrapperClassName?: string;
  children: React.ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  const { onPressIn, onPressOut } = props;
  return (
    <Pressable
      hitSlop={hitSlop}
      pressRetentionOffset={16}
      className={wrapperClassName}
      {...props}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
    >
      <Animated.View
        className={cn(className)}
        style={[base, pressed && !reduced && { transform: [{ scale: 0.97 }] }]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
