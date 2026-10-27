import { Text as RNText, TextProps } from "react-native";
import { cn } from "./cn";

// Typography only; the default color is separate so a caller's color can replace it.
const variants = {
  display: "text-display",
  headline: "text-headline",
  "headline-sm": "text-headline-sm",
  heading: "text-heading",
  title: "text-title",
  "title-sm": "text-title-sm",
  lead: "text-lead",
  body: "text-body",
  small: "text-small",
  micro: "text-micro",
  caption: "text-caption",
  button: "text-button",
} as const;

const defaultColors: Record<keyof typeof variants, string> = {
  display: "text-ink",
  headline: "text-ink",
  "headline-sm": "text-ink",
  heading: "text-ink",
  title: "text-ink",
  "title-sm": "text-ink",
  lead: "text-muted",
  body: "text-muted",
  small: "text-muted",
  micro: "text-muted",
  caption: "text-ink",
  button: "text-ink",
};

// Generated CSS orders color utilities alphabetically, not by class order, so a caller's
// `text-danger` would lose to the default `text-ink`. Drop the default when a color is given.
const colorClass = /(^|\s)text-(ink|muted|danger|success|primary|secondary\S*|surface\S*|on-\S+)(\s|$)/;

export type TextVariant = keyof typeof variants;

export function Text({
  variant = "body",
  className,
  ...props
}: TextProps & { variant?: TextVariant }) {
  const color = className && colorClass.test(className) ? undefined : defaultColors[variant];
  return <RNText className={cn(variants[variant], color, className)} {...props} />;
}
