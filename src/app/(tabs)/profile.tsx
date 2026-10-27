import { useUser } from "@clerk/expo";
import { Link } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Avatar, Button, Text } from "@/components";
import { useSignOut } from "@/lib/auth";

// Placeholder until the profile design is built. Holds Sign out for now.
export default function Profile() {
  const { user } = useUser();
  const signOut = useSignOut();
  const [loading, setLoading] = useState(false);
  const name = user?.fullName ?? user?.firstName ?? "Guest";

  const onSignOut = async () => {
    setLoading(true);
    const result = await signOut();
    // On success the route guards move to onboarding and this screen unmounts.
    if (!result.ok) setLoading(false);
  };

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-surface px-5">
      <Avatar name={name} imageUrl={user?.imageUrl} />
      <Text variant="heading">{name}</Text>
      {user?.primaryEmailAddress ? <Text variant="body">{user.primaryEmailAddress.emailAddress}</Text> : null}
      <Link href="/design-system">
        <Text variant="caption" className="text-ink underline">
          Open the design system
        </Text>
      </Link>
      <Button title="Sign out" variant="secondary" size="sm" loading={loading} onPress={onSignOut} />
    </View>
  );
}
