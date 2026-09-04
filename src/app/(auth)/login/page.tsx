"use client";

import { useActionState } from "react";
import { login, type AuthState } from "../actions";
import { Input, Button } from "@/components/ui";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(login, {
    error: null,
  });

  return (
    <form action={formAction} className="space-y-4">
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
        <Input name="password" type="password" placeholder="••••••••" required />
      </div>
      {state.error && (
        <p className="text-sm text-error">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Logging in..." : "Log in"}
      </Button>
      <p className="text-center text-sm text-text-tertiary">
        Don&apos;t have an account?{" "}
        <a href="/signup" className="text-accent hover:underline">
          Sign up
        </a>
      </p>
    </form>
  );
}