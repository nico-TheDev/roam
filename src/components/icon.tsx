import { styled } from "nativewind";
import { createElement } from "react";
import { Platform } from "react-native";
import type { LucideIcon } from "lucide-react-native";

// styled() must run outside render, so each icon is wrapped once and cached.
const cache = new WeakMap<LucideIcon, LucideIcon>();

// On web, NativeWind's styled() would hand the SVG a style object as className. The browser already resolves
// `currentColor` from the className's CSS color, so the icon takes the class as is.
function styledIcon(icon: LucideIcon) {
  if (Platform.OS === "web") return icon;
  let wrapped = cache.get(icon);
  if (!wrapped) {
    wrapped = styled(icon, {
      className: { target: false, nativeStyleMapping: { color: true } },
    }) as unknown as LucideIcon;
    cache.set(icon, wrapped);
  }
  return wrapped;
}

const sizes = { sm: 16, md: 20, lg: 24 } as const;

/** Lucide icon colored with a text token class, e.g. `className="text-muted"`. */
export function Icon({
  icon,
  size = "md",
  className = "text-ink",
  filled,
  ...props
}: {
  icon: LucideIcon;
  size?: keyof typeof sizes;
  className?: string;
  strokeWidth?: number;
  /** Fill the shape with the icon color. */
  filled?: boolean;
}) {
  return createElement(styledIcon(icon), {
    size: sizes[size],
    className,
    fill: filled ? "currentColor" : "none",
    ...props,
  });
}
