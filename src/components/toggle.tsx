import { Switch, SwitchProps } from "react-native";

// Native Switch needs color values, not classes: these mirror --color-primary and --color-border.
const TRACK_ON = "#ffc629";
const TRACK_OFF = "#e5e7eb";

export function Toggle({ label, ...props }: Omit<SwitchProps, "trackColor"> & { label: string }) {
  return (
    <Switch
      accessibilityLabel={label}
      trackColor={{ true: TRACK_ON, false: TRACK_OFF }}
      {...props}
    />
  );
}
