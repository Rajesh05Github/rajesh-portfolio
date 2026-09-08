"use client";

import { useActionState, useRef, useEffect } from "react";
import {
  changeAdminPassword,
  type ChangePasswordState,
} from "@/features/auth/actions";
import { TextField } from "@/components/admin/form-fields";
import { SubmitButton } from "@/components/admin/submit-button";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changeAdminPassword, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="max-w-md space-y-6">
      <TextField
        name="currentPassword"
        label="Current password"
        type="password"
        required
      />
      <TextField
        name="newPassword"
        label="New password"
        type="password"
        required
      />
      <TextField
        name="confirmPassword"
        label="Confirm new password"
        type="password"
        required
      />

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.success && (
        <p className="text-primary text-sm">Password changed.</p>
      )}

      <SubmitButton>Change password</SubmitButton>
    </form>
  );
}
