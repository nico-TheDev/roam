import { useUser } from "@clerk/expo";
import { Mail, TriangleAlert, User } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Alert, Avatar, Button, Icon, Text, TextField } from "@/components";
import { useProfilePhoto, useUpdateName } from "@/lib/account";
import { validateName } from "@/lib/validation";

// Opened from the Profile tab. Name and photo go to Clerk; the email is shown but changed elsewhere (out of scope).
export default function PersonalInfo() {
  const { user } = useUser();
  const updateName = useUpdateName();
  const photo = useProfilePhoto();
  const saved = user?.fullName ?? user?.firstName ?? "";
  const [name, setName] = useState(saved);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState<"save" | "pick" | "remove" | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const error = touched ? validateName(name) : undefined;
  const dirty = name.trim() !== saved;

  const run = async (kind: NonNullable<typeof busy>, action: () => Promise<{ ok: boolean; error?: string }>, done: string) => {
    setBusy(kind);
    setMessage(null);
    const result = await action();
    setBusy(null);
    setMessage(result.ok ? { tone: "success", text: done } : { tone: "danger", text: result.error ?? "" });
  };

  const onSave = () => {
    setTouched(true);
    if (validateName(name)) return;
    run("save", () => updateName(name), "Saved.");
  };

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="gap-6 px-5 pb-10 pt-6"
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="heading">Personal info</Text>

      <View className="flex-row items-center gap-4">
        <Avatar name={saved || "Guest"} imageUrl={user?.imageUrl} size="lg" />
        <View className="flex-1 gap-2">
          <Button
            title={user?.hasImage ? "Change photo" : "Add photo"}
            variant="secondary"
            size="sm"
            loading={busy === "pick"}
            disabled={!!busy && busy !== "pick"}
            onPress={() => run("pick", photo.pick, "Photo updated.")}
          />
          {user?.hasImage ? (
            <Button
              title="Remove photo"
              variant="secondary"
              size="sm"
              loading={busy === "remove"}
              disabled={!!busy && busy !== "remove"}
              onPress={() => run("remove", photo.remove, "Photo removed.")}
            />
          ) : null}
        </View>
      </View>

      {message ? (
        <Alert
          tone={message.tone}
          message={message.text}
          icon={message.tone === "danger" ? <Icon icon={TriangleAlert} className="text-danger" /> : undefined}
        />
      ) : null}

      <View className="gap-4">
        <TextField
          label="Full name"
          title="Full name"
          leading={<Icon icon={User} size="lg" />}
          value={name}
          onChangeText={setName}
          onBlur={() => setTouched(true)}
          error={error}
          autoComplete="name"
          textContentType="name"
          returnKeyType="done"
          onSubmitEditing={onSave}
        />
        <View className="flex-row items-center gap-3 px-1">
          <Icon icon={Mail} className="text-muted" />
          <Text variant="body" className="flex-1">
            {user?.primaryEmailAddress?.emailAddress ?? "No email"}
          </Text>
        </View>
      </View>

      <Button title="Save" loading={busy === "save"} disabled={!dirty || !!busy} onPress={onSave} />
    </ScrollView>
  );
}
