"use client";

import { useActionState } from "react";
import { sendContactMessage } from "@/actions/contact";
import { Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function ContactForm() {
  const [state, action] = useActionState(sendContactMessage, null);
  if (state?.ok) return <Alert tone="success" title="ההודעה נשלחה">{state.message}</Alert>;
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <Input label="שם מלא" name="name" required autoComplete="name" error={fe.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="דוא״ל" name="email" type="email" required autoComplete="email" dir="ltr" error={fe.email} />
        <Input label="טלפון" name="phone" type="tel" autoComplete="tel" dir="ltr" error={fe.phone} />
      </div>
      <Textarea label="הודעה" name="message" required rows={5} error={fe.message} />
      <div className="hidden" aria-hidden="true">
        <label>אתר <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <SubmitButton pendingText="שולח...">שליחה</SubmitButton>
    </form>
  );
}
