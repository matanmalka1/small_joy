"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/actions/account";
import { Input, Checkbox } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function ProfileForm({ name, email, phone, marketingOptIn }: { name: string; email: string; phone: string; marketingOptIn: boolean }) {
  const [state, action] = useActionState(updateProfileAction, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="max-w-lg space-y-4">
      {state?.ok && <Alert tone="success">{state.message}</Alert>}
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <Input label="שם מלא" name="name" defaultValue={name} required error={fe.name} />
      <Input label="דוא״ל" name="email" defaultValue={email} disabled dir="ltr" hint="לשינוי כתובת הדוא״ל יש לפנות לחנות" />
      <Input label="טלפון" name="phone" type="tel" defaultValue={phone} dir="ltr" error={fe.phone} />
      <Checkbox name="marketingOptIn" label="אשמח לקבל עדכונים על מבצעים (ניתן להסיר בכל עת)" defaultChecked={marketingOptIn} />
      <SubmitButton pendingText="שומר...">שמירה</SubmitButton>
    </form>
  );
}
