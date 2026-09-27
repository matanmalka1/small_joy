"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/actions/auth";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <input type="hidden" name="next" value={next ?? ""} />
      <Input label="דוא״ל" name="email" type="email" autoComplete="email" dir="ltr" required error={fe.email} />
      <Input label="סיסמה" name="password" type="password" autoComplete="current-password" dir="ltr" required error={fe.password} />
      <div className="flex items-center justify-between">
        <Link href="/account/forgot-password" className="text-sm text-teal hover:underline">שכחת סיסמה?</Link>
      </div>
      <SubmitButton className="w-full" pendingText="מתחבר...">התחברות</SubmitButton>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useActionState(registerAction, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <input type="hidden" name="next" value={next ?? ""} />
      <Input label="שם מלא" name="name" autoComplete="name" required error={fe.name} />
      <Input label="דוא״ל" name="email" type="email" autoComplete="email" dir="ltr" required error={fe.email} />
      <Input label="סיסמה" name="password" type="password" autoComplete="new-password" dir="ltr" required hint="לפחות 8 תווים" error={fe.password} />
      <Input label="אימות סיסמה" name="confirm" type="password" autoComplete="new-password" dir="ltr" required error={fe.confirm} />
      <SubmitButton className="w-full" pendingText="נרשם...">הרשמה</SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(forgotPasswordAction, null);
  if (state?.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <Input label="דוא״ל" name="email" type="email" autoComplete="email" dir="ltr" required error={state?.fieldErrors?.email} />
      <SubmitButton className="w-full" pendingText="שולח...">שליחת קישור לאיפוס</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <input type="hidden" name="token" value={token} />
      <Input label="סיסמה חדשה" name="password" type="password" autoComplete="new-password" dir="ltr" required error={fe.password} />
      <Input label="אימות סיסמה" name="confirm" type="password" autoComplete="new-password" dir="ltr" required error={fe.confirm} />
      <SubmitButton className="w-full" pendingText="שומר...">שמירת סיסמה</SubmitButton>
    </form>
  );
}
