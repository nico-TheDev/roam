import { useLocalSearchParams } from "expo-router";
import { ArrowRight, CircleCheck, TriangleAlert } from "lucide-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Alert, AuthScreen, Button, CodeInput, Icon, Text } from "@/components";
import { CODE_LENGTH, resendCode, verifyCode } from "@/lib/auth";
import { useEnterApp } from "@/lib/use-enter-app";

const RESEND_SECONDS = 30;

export default function Verify() {
  const { email = "" } = useLocalSearchParams<{ email?: string }>();
  const enterApp = useEnterApp();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = async () => {
    if (code.length < CODE_LENGTH) return;
    setError(null);
    setNotice(null);
    setLoading(true);
    const result = await verifyCode(email, code);
    setLoading(false);
    if (result.ok) enterApp();
    else setError(result.error);
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    setResending(true);
    const result = await resendCode(email);
    setResending(false);
    if (result.ok) {
      setCode("");
      setCooldown(RESEND_SECONDS);
      setNotice("We sent you a new code.");
    } else setError(result.error);
  };

  return (
    <AuthScreen
      title="Verify your email"
      subtitle={`We sent a 6-digit code to ${email || "your email"}. Enter it below to finish creating your account.`}
    >
      <CodeInput value={code} onChange={setCode} length={CODE_LENGTH} error={!!error} autoFocus />
      {error ? (
        <Alert tone="danger" message={error} icon={<Icon icon={TriangleAlert} className="text-danger" />} />
      ) : null}
      {notice ? (
        <Alert tone="success" message={notice} icon={<Icon icon={CircleCheck} className="text-success" />} />
      ) : null}
      <View className="gap-6">
        <Button
          title="Verify"
          trailing={<Icon icon={ArrowRight} />}
          loading={loading}
          disabled={code.length < CODE_LENGTH || resending}
          onPress={submit}
        />
        <View className="items-center">
          {cooldown > 0 ? (
            <Text variant="small">Resend code in {cooldown}s</Text>
          ) : (
            <Button
              title="Resend code"
              variant="secondary"
              size="sm"
              loading={resending}
              disabled={loading}
              onPress={resend}
            />
          )}
        </View>
      </View>
    </AuthScreen>
  );
}
