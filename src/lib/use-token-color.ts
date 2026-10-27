import { useUnstableNativeVariable } from "nativewind";
import { Platform, useColorScheme } from "react-native";

// For props that need a color value instead of a class (TextInput placeholder, native tab tint).
// nativewind's types resolve to the web stub (`() => never`); on native the hook takes the variable name.
const readVariable = useUnstableNativeVariable as unknown as (name: string) => string | undefined;

// The web stub throws, but the tokens are plain CSS variables there. Reading the scheme re-renders on a theme change.
function useWebVariable(name: string) {
  useColorScheme();
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined;
}

const useVariable = Platform.OS === "web" ? useWebVariable : readVariable;

/** Current value of a color token from `src/global.css`, e.g. `useTokenColor("--color-primary")`. Follows dark mode. */
export function useTokenColor(name: `--color-${string}`) {
  return useVariable(name);
}
