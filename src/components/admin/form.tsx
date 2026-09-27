"use client";

import { createContext, useActionState, useContext, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { FormState } from "@/lib/action-result";
import { Alert } from "@/components/ui/alert";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { toast } from "@/components/ui/toast";

type Errors = Record<string, string[] | undefined>;
const ErrorsCtx = createContext<Errors>({});

/**
 * Generic admin form bound to a server action (useActionState). Field
 * components below read their validation errors from context by name.
 */
export function AdminForm({
  action,
  children,
  submitLabel = "שמירה",
  className = "space-y-4",
  resetOnSuccess,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      toast(state.message ?? "נשמר");
      if (resetOnSuccess) ref.current?.reset();
      router.refresh();
    }
  }, [state, router, resetOnSuccess]);
  return (
    <ErrorsCtx.Provider value={state?.fieldErrors ?? {}}>
      <form ref={ref} action={formAction} className={className} noValidate>
        {state?.error && <Alert tone="danger">{state.error}</Alert>}
        {children}
        {submitLabel && <SubmitButton pendingText="שומר...">{submitLabel}</SubmitButton>}
      </form>
    </ErrorsCtx.Provider>
  );
}

export function useFieldError(name: string) {
  return useContext(ErrorsCtx)[name];
}

export function AInput(props: React.ComponentProps<typeof Input>) {
  const err = useFieldError(props.name);
  return <Input {...props} error={props.error ?? err} />;
}

export function ATextarea(props: React.ComponentProps<typeof Textarea>) {
  const err = useFieldError(props.name);
  return <Textarea {...props} error={props.error ?? err} />;
}

export function ASelect(props: React.ComponentProps<typeof Select>) {
  const err = useFieldError(props.name);
  return <Select {...props} error={props.error ?? err} />;
}

export function ACheckbox(props: React.ComponentProps<typeof Checkbox>) {
  return <Checkbox {...props} />;
}

export function FieldError({ name }: { name: string }) {
  const err = useFieldError(name);
  return err ? <p className="text-sm text-danger" role="alert">{err[0]}</p> : null;
}

/** Button that asks for confirmation before submitting its parent form. */
export function ConfirmButton({ children, message, className }: { children: React.ReactNode; message: string; className?: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
