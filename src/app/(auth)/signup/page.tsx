"use client";

import { useActionState } from "react";
import { signup, type AuthState } from "../actions";
import { Input, Button } from "@/components/ui";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signup, {
    error: null,
  });

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-text-secondary">
          Display Name
        </label>
        <Input name="displayName" type="text" placeholder="Jane Doe" required />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-text-secondary">
          Email
        </label>
        <Input name="email" type="email" placeholder="you@example.com" required />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-text-secondary">
          Password
        </label>
        <Input name="password" type="password" placeholder="At least 8 characters" required />
      </div>
      {state.error && (
        <p className="text-sm text-error">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account..." : "Sign up"}
      </Button>
      <p className="text-center text-sm text-text-tertiary">
        Already have an account?{" "}
        <a href="/login" className="text-accent hover:underline">
          Log in
        </a>
      </p>
    </form>
  );
}