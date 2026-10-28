import { useRouter } from "expo-router";
import { ArrowRight, Lock, Mail, TriangleAlert } from "lucide-react-native";
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
  Text,
  TextField,
  TextFieldRef,
} from "@/components";
import { DEMO_LOGIN_HINT } from "@/lib/demo";
import { useProviderAuth, useSignInFlow } from "@/lib/auth";
import { validateEmail, validatePassword } from "@/lib/validation";

type Field = "email" | "password";

export default function SignIn() {
  const router = useRouter();
  const signIn = useSignInFlow();
  const authWithProvider = useProviderAuth();
  const passwordRef = useRef<TextFieldRef>(null);
  const [values, setValues] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState<Record<Field, boolean>>({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [social, setSocial] = useState<SocialProvider | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const errors = { email: validateEmail(values.email), password: validatePassword(values.password) };
  const shown = (f: Field) => (touched[f] ? errors[f] : undefined);
  const busy = loading || social !== null;

  const set = (field: Field) => (text: string) => setValues((v) => ({ ...v, [field]: text }));
  // Only flag a field on blur once it has text; empty fields are flagged on submit.
  const touch = (field: Field) => () => {
    if (values[field]) setTouched((t) => ({ ...t, [field]: true }));
  };

  const submit = async () => {
    setTouched({ email: true, password: true });
    setFormError(null);
    if (errors.email || errors.password) return;
    setLoading(true);
    const email = values.email.trim();
    const result = await signIn.start({ email, password: values.password });
    setLoading(false);
    if (!result.ok) setFormError(result.error);
    else if (result.next === "verify") router.push({ pathname: "/verify", params: { email, flow: "sign-in" } });
  };

  const continueWith = async (provider: SocialProvider) => {
    setFormError(null);
    setSocial(provider);
    const result = await authWithProvider(provider);
    setSocial(null);
    if (!result.ok) setFormError(result.error);
  };

  return (
    <AuthScreen title="Welcome back" subtitle="Sign in to see your saved stays and pick up where you left off.">
      <View className="gap-4">
        <TextField
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
          placeholder="Your password"
          leading={<Icon icon={Lock} size="lg" />}
          value={values.password}
          onChangeText={set("password")}
          onBlur={touch("password")}
          error={shown("password")}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={submit}
        />
      </View>
      {formError ? (
        <Alert tone="danger" message={formError} icon={<Icon icon={TriangleAlert} className="text-danger" />} />
      ) : null}
      <View className="gap-6">
        <Button
          title="Sign in"
          trailing={<Icon icon={ArrowRight} />}
          loading={loading}
          disabled={busy && !loading}
          onPress={submit}
        />
        <Divider label="or" />
        <SocialButtons providers={["google"]} onPress={continueWith} loading={social} disabled={busy} />
      </View>
      <Text variant="small" className="text-center">
        {DEMO_LOGIN_HINT}
      </Text>
      <AuthSwitch prompt="New to roam?" action="Create an account" href="/sign-up" />
    </AuthScreen>
  );
}
