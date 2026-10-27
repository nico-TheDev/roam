import { NativeTabs } from "expo-router/native-tabs";
import { useTokenColor } from "@/lib/use-token-color";

// The platform's own tab bar (liquid glass on iOS 26, Material 3 on Android). Tabs never animate between each other.
export default function TabsLayout() {
  const ink = useTokenColor("--color-ink");
  const primary = useTokenColor("--color-primary");
  return (
    <NativeTabs tintColor={ink} indicatorColor={primary}>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="trips">
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        <NativeTabs.Trigger.Label>Trips</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
