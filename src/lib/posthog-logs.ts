import { posthog } from "@/lib/posthog";

type LogAttributes = Record<string, boolean | number | string>;

// This dedicated logger is the only route for application logs exported to PostHog.
export const posthogLog = {
  info(message: string, attributes: LogAttributes) {
    posthog?.logger.info(message, attributes);
  },
  warn(message: string, attributes: LogAttributes) {
    posthog?.logger.warn(message, attributes);
  },
};
