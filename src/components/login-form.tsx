"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { enterMuseum, type LoginState } from "@/app/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="primary-button" disabled={pending} type="submit">{pending ? "Checking the guest list…" : "Unlock the archive"}{!pending && <span>→</span>}</button>;
}

export function LoginForm() {
  const [state, action] = useActionState(enterMuseum, {} as LoginState);
  return <form action={action} className="access-form">
    <label htmlFor="access-code">League access code</label>
    <input aria-describedby={state.error ? "access-error" : undefined} aria-invalid={Boolean(state.error)} autoComplete="current-password" id="access-code" name="accessCode" placeholder="Enter access code" required type="password" />
    {state.error && <p id="access-error" className="form-error">{state.error}</p>}
    <SubmitButton />
  </form>;
}
