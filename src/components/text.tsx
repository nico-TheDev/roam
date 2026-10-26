import { Text as RNText, TextProps } from "react-native";
import { cn } from "./cn";

const variants = {
  display: "text-display text-ink",
  heading: "text-heading text-ink",
  title: "text-title text-ink",
  body: "text-body text-muted",
  small: "text-small text-muted",
  caption: "text-caption text-ink",
  button: "text-button text-ink",
} as const;

export type TextVariant = keyof typeof variants;

export function Text({
  variant = "body",
  className,
  ...props
}: TextProps & { variant?: TextVariant }) {
  // Caller classes come last so they can recolor or align, not resize.
  return <RNText className={cn(variants[variant], className)} {...props} />;
}
