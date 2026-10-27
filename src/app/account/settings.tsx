import { Alert as NativeAlert, ScrollView, View } from "react-native";
import { LogOut, Lock, Trash2, TriangleAlert } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Button, DeviceRow, Icon, Text, TextField } from "@/components";
import { lastActiveLabel, useDeleteAccount, useDevices } from "@/lib/account";
import { useSignOut } from "@/lib/auth";
import { posthog } from "@/lib/posthog";

const CONFIRM_WORD = "DELETE";

// Opened from the gear on the Profile tab. Sign out and delete never navigate: the route guards react to the session.
export default function AccountSettings() {
  useEffect(() => {
    posthog?.capture("account_settings_opened");
  }, []);

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="gap-8 px-5 pb-10 pt-6"
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="heading">Settings</Text>
      <Devices />
      <SignOut />
      <DeleteAccount />
    </ScrollView>
  );
}

function Devices() {
  const { state, reload, revokeOthers } = useDevices();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onRevoke = async () => {
    setBusy(true);
    setError(null);
    const result = await revokeOthers();
    setBusy(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <View className="gap-3">
      <Text variant="title">Signed-in devices</Text>
      {state.status === "loading" ? <Text variant="body">Loading devices…</Text> : null}
      {state.status === "error" ? (
        <View className="gap-3">
          <Text variant="body">We couldn&apos;t load your devices.</Text>
          <Button title="Try again" variant="secondary" size="sm" onPress={reload} />
        </View>
      ) : null}
      {state.status === "ready" ? (
        <>
          {state.devices.length === 0 ? <Text variant="body">No active devices.</Text> : null}
          {state.devices.map((d) => (
            <DeviceRow
              key={d.id}
              label={d.label}
              place={d.place}
              lastActive={lastActiveLabel(d.lastActiveAt)}
              current={d.current}
              mobile={d.label.startsWith("Phone")}
            />
          ))}
          {state.devices.some((d) => !d.current) ? (
            <Button
              title="Sign out other devices"
              variant="secondary"
              size="sm"
              loading={busy}
              onPress={onRevoke}
            />
          ) : null}
        </>
      ) : null}
      {error ? <Alert tone="danger" message={error} icon={<Icon icon={TriangleAlert} className="text-danger" />} /> : null}
    </View>
  );
}

function SignOut() {
  const signOut = useSignOut();
  const [loading, setLoading] = useState(false);

  const confirm = () =>
    NativeAlert.alert("Sign out?", "You'll need to sign in again to see your account.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          const result = await signOut();
          // On success the route guards move to onboarding and this sheet unmounts.
          if (result.ok) posthog?.capture("user_signed_out");
          else {
            posthog?.capture("user_sign_out_failed");
            setLoading(false);
          }
        },
      },
    ]);

  return (
    <Button
      title="Sign out"
      variant="secondary"
      loading={loading}
      icon={<Icon icon={LogOut} />}
      onPress={confirm}
    />
  );
}

function DeleteAccount() {
  const account = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hidden unless the Clerk instance allows users to delete themselves.
  if (!account.available) return null;

  const onDelete = async () => {
    setLoading(true);
    setError(null);
    const result = await account.remove();
    // On success the user is gone, the guards move to onboarding and this sheet unmounts.
    if (!result.ok) {
      setLoading(false);
      setError(result.error);
    }
  };

  const onConfirmPassword = async () => {
    setError(null);
    const result = await account.confirmPassword(password);
    if (!result.ok) setError(result.error);
  };

  if (!open) {
    return (
      <Button title="Delete account" variant="danger" icon={<Icon icon={Trash2} className="text-danger" />} onPress={() => {
          posthog?.capture("account_delete_started");
          setOpen(true);
        }}
      />
    );
  }

  return (
    <View className="gap-4">
      <Text variant="title">Delete account</Text>
      <Text variant="body">
        This permanently deletes your Roam account and can&apos;t be undone. Type {CONFIRM_WORD} to confirm.
      </Text>
      <TextField
        label={`Type ${CONFIRM_WORD} to confirm`}
        placeholder={CONFIRM_WORD}
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!loading}
      />

      {account.needsPassword ? (
        account.hasPassword ? (
          <View className="gap-3">
            <Text variant="body">Enter your password to confirm it&apos;s you.</Text>
            <TextField
              label="Password"
              title="Password"
              leading={<Icon icon={Lock} size="lg" />}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              onSubmitEditing={onConfirmPassword}
            />
            <Button title="Confirm password" disabled={!password} onPress={onConfirmPassword} />
            <Button title="Cancel" variant="secondary" size="sm" onPress={account.cancelReverification} />
          </View>
        ) : (
          <Alert
            tone="danger"
            message="For your security, sign out and sign in again, then delete your account."
            icon={<Icon icon={TriangleAlert} className="text-danger" />}
          />
        )
      ) : null}

      {error ? <Alert tone="danger" message={error} icon={<Icon icon={TriangleAlert} className="text-danger" />} /> : null}

      {account.needsPassword ? null : (
        <View className="gap-3">
          <Button
            title="Delete my account"
            variant="danger"
            loading={loading}
            disabled={typed !== CONFIRM_WORD}
            onPress={onDelete}
          />
          <Button title="Cancel" variant="secondary" size="sm" disabled={loading} onPress={() => {
              posthog?.capture("account_delete_cancelled");
              setOpen(false);
            }}
          />
        </View>
      )}
    </View>
  );
}
