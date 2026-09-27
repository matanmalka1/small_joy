"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./button";
import { Spinner } from "./spinner";

type Props = React.ComponentProps<typeof Button> & { pendingText?: string };

export function SubmitButton({ children, pendingText, disabled, ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...rest}>
      {pending ? (
        <>
          <Spinner /> {pendingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
