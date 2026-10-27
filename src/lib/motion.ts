import { useMemo } from "react";
import { Easing, FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";

// Strong ease-out for things entering the screen (expo-animation skill). Never ease-in on UI.
const EASE_OUT = Easing.bezierFn(0.23, 1, 0.32, 1);

/**
 * Entrance for content the user asked for and is waiting on: 250 ms fade and 12 px rise, staggered 40-50 ms per index.
 * Past `cap` rows everything shares the last delay, so a long list never feels slow. With Reduce Motion on it is a plain fade.
 * Memoized because layout animations should not be rebuilt on every render.
 */
export function useEntering(index = 0, { stagger = 50, cap = 6 } = {}) {
  const reduced = useReducedMotion();
  return useMemo(() => {
    const preset = reduced ? FadeIn : FadeInDown;
    return preset.duration(250).delay(Math.min(index, cap) * stagger).easing(EASE_OUT);
  }, [reduced, index, stagger, cap]);
}
