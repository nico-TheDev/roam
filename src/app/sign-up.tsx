import { useRouter } from "expo-router";
import { ArrowRight, Lock, Mail, TriangleAlert, User } from "lucide-react-native";
import { useRef, useState } from "react";
import { View } from "react-native";
import {
  Alert,
  AuthScreen,
  AuthSwitch,
  Button,
  Divider,
  Icon,
  SocialButtons,
  SocialProvider,
  TextField,
  TextFieldRef,
} from "@/components";
import { signInWithProvider, signUp } from "@/lib/auth";
import { useEnterApp } from "@/lib/use-enter-app";
import { validateEmail, validateName, validatePassword } from "@/lib/validation";

type Field = "name" | "email" | "password";

export default function SignUp() {
  const router = useRouter();
  const enterApp = useEnterApp();
  const emailRef = useRef<TextFieldRef>(null);
  const passwordRef = useRef<TextFieldRef>(null);
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [touched, setTouched] = useState<Record<Field, boolean>>({ name: false, email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [social, setSocial] = useState<SocialProvider | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const errors = {
    name: validateName(values.name),
    email: validateEmail(values.email),
    password: validatePassword(values.password),
  };
  const shown = (f: Field) => (touched[f] ? errors[f] : undefined);
  const busy = loading || social !== null;

  const set = (field: Field) => (text: string) => setValues((v) => ({ ...v, [field]: text }));
  // Only flag a field on blur once it has text; empty fields are flagged on submit.
  const touch = (field: Field) => () => {
    if (values[field]) setTouched((t) => ({ ...t, [field]: true }));
  };

  const submit = async () => {
    setTouched({ name: true, email: true, password: true });
    setFormError(null);
    if (errors.name || errors.email || errors.password) return;
    setLoading(true);
    const result = await signUp({ name: values.name.trim(), email: values.email.trim(), password: values.password });
    setLoading(false);
    if (result.ok) router.push({ pathname: "/verify", params: { email: values.email.trim() } });
    else setFormError(result.error);
  };

  const continueWith = async (provider: SocialProvider) => {
    setFormError(null);
    setSocial(provider);
    const result = await signInWithProvider(provider);
    setSocial(null);
    if (result.ok) enterApp();
    else setFormError(result.error);
  };

  return (
    <AuthScreen
      title={"Create\nyour account"}
      subtitle="Join roam to save your stays, get personalized recommendations and access them across all your devices."
    >
      <View className="gap-4">
        <TextField
          label="Full name"
          title="Full name"
          placeholder="e.g. Adrian Hajdin"
          leading={<Icon icon={User} size="lg" />}
          value={values.name}
          onChangeText={set("name")}
          onBlur={touch("name")}
          error={shown("name")}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <TextField
          inputRef={emailRef}
          label="Email address"
          title="Email address"
          placeholder="you@example.com"
          leading={<Icon icon={Mail} size="lg" />}
          value={values.email}
          onChangeText={set("email")}
          onBlur={touch("email")}
          error={shown("email")}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          inputRef={passwordRef}
          label="Password"
          title="Password"
          placeholder="At least 8 characters"
          leading={<Icon icon={Lock} size="lg" />}
          value={values.password}
          onChangeText={set("password")}
          onBlur={touch("password")}
          error={shown("password")}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={submit}
        />
      </View>
      {formError ? (
        <Alert tone="danger" message={formError} icon={<Icon icon={TriangleAlert} className="text-danger" />} />
      ) : null}
      <View className="gap-6">
        <Button
          title="Create account"
          trailing={<Icon icon={ArrowRight} />}
          loading={loading}
          disabled={busy && !loading}
          onPress={submit}
        />
        <Divider label="or" />
        <SocialButtons onPress={continueWith} loading={social} disabled={busy} />
      </View>
      <AuthSwitch prompt="Already have an account?" action="Sign in" href="/sign-in" />
    </AuthScreen>
  );
}
