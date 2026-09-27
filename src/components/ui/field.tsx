import { cn } from "@/lib/cn";

export const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 h-11 text-base text-ink placeholder:text-ink-soft/70 focus:border-teal focus:outline-none focus-visible:outline-2 focus-visible:outline-teal aria-[invalid=true]:border-danger disabled:bg-sand";

type FieldProps = {
  label: string;
  name: string;
  error?: string | string[];
  hint?: string;
  required?: boolean;
  className?: string;
  children?: React.ReactNode;
};

/** Label + control + hint + error with correct aria wiring. Pass the control as children or use <Input>. */
export function Field({ label, name, error, hint, required, className, children }: FieldProps) {
  const err = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={name} className="text-sm font-semibold text-ink">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !err && (
        <p id={`${name}-hint`} className="text-xs text-ink-soft">
          {hint}
        </p>
      )}
      {err && (
        <p id={`${name}-error`} className="text-sm text-danger" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string | string[];
  hint?: string;
  fieldClassName?: string;
};

export function Input({ label, name, error, hint, required, fieldClassName, className, id, ...rest }: InputProps) {
  const err = Array.isArray(error) ? error[0] : error;
  return (
    <Field label={label} name={id ?? name} error={err} hint={hint} required={required} className={fieldClassName}>
      <input
        id={id ?? name}
        name={name}
        required={required}
        aria-invalid={err ? true : undefined}
        aria-describedby={err ? `${id ?? name}-error` : hint ? `${id ?? name}-hint` : undefined}
        className={cn(inputClass, className)}
        {...rest}
      />
    </Field>
  );
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  name: string;
  error?: string | string[];
  hint?: string;
  fieldClassName?: string;
};

export function Textarea({ label, name, error, hint, required, fieldClassName, className, id, ...rest }: TextareaProps) {
  const err = Array.isArray(error) ? error[0] : error;
  return (
    <Field label={label} name={id ?? name} error={err} hint={hint} required={required} className={fieldClassName}>
      <textarea
        id={id ?? name}
        name={name}
        required={required}
        aria-invalid={err ? true : undefined}
        aria-describedby={err ? `${id ?? name}-error` : hint ? `${id ?? name}-hint` : undefined}
        className={cn(inputClass, "h-auto min-h-24 py-2.5", className)}
        {...rest}
      />
    </Field>
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  name: string;
  error?: string | string[];
  hint?: string;
  fieldClassName?: string;
};

export function Select({ label, name, error, hint, required, fieldClassName, className, id, children, ...rest }: SelectProps) {
  const err = Array.isArray(error) ? error[0] : error;
  return (
    <Field label={label} name={id ?? name} error={err} hint={hint} required={required} className={fieldClassName}>
      <select
        id={id ?? name}
        name={name}
        required={required}
        aria-invalid={err ? true : undefined}
        className={cn(inputClass, "pe-8", className)}
        {...rest}
      >
        {children}
      </select>
    </Field>
  );
}

export function Checkbox({
  label,
  name,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; name: string }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm", className)}>
      <input type="checkbox" name={name} className="size-4.5 accent-teal" {...rest} />
      <span>{label}</span>
    </label>
  );
}
