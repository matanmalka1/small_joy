"use client";

import { useActionState, useTransition } from "react";
import { addAddressAction, deleteAddressAction, setDefaultAddressAction } from "@/actions/account";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddressFields } from "./address-fields";

type Address = { id: string; label: string | null; fullName: string; phone: string; text: string; isDefault: boolean };

export function AddressBook({ addresses }: { addresses: Address[] }) {
  const [state, action] = useActionState(addAddressAction, null);
  const [pending, start] = useTransition();
  const fe = state?.fieldErrors ?? {};
  return (
    <div className="space-y-6">
      {addresses.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="space-y-2 rounded-2xl border border-line bg-surface p-4 text-sm">
              <div className="flex items-center gap-2">
                <p className="font-bold">{a.label || a.fullName}</p>
                {a.isDefault && <Badge tone="info">ברירת מחדל</Badge>}
              </div>
              <p className="text-ink-soft">{a.text}</p>
              <p className="text-ink-soft ltr-nums">{a.phone}</p>
              <div className="flex gap-2 pt-1">
                {!a.isDefault && (
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => start(() => setDefaultAddressAction(a.id))}>קביעה כברירת מחדל</Button>
                )}
                <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => start(() => deleteAddressAction(a.id))}>מחיקה</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <h3 className="text-lg">הוספת כתובת</h3>
        {state?.ok && <Alert tone="success">{state.message}</Alert>}
        {state?.error && <Alert tone="danger">{state.error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="כינוי (למשל: בית)" name="label" error={fe.label} />
          <Input label="שם הנמען" name="fullName" required autoComplete="name" error={fe.fullName} />
          <Input label="טלפון" name="phone" type="tel" dir="ltr" required autoComplete="tel" error={fe.phone} />
        </div>
        <AddressFields errors={fe} />
        <SubmitButton pendingText="שומר...">שמירת כתובת</SubmitButton>
      </form>
    </div>
  );
}
