import { useUnstableNativeVariable } from "nativewind";

// For props that need a color value instead of a class (TextInput placeholder, native tab tint).
// nativewind's types resolve to the web stub (`() => never`); on native the hook takes the variable name.
const readVariable = useUnstableNativeVariable as unknown as (name: string) => string | undefined;

/** Current value of a color token from `src/global.css`, e.g. `useTokenColor("--color-primary")`. Follows dark mode. */
export function useTokenColor(name: `--color-${string}`) {
  return readVariable(name);
}
