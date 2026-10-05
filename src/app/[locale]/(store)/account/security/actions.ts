"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/form-state";
import { field, toFormState } from "@/server/action-errors";
import { assertUser, authHeaders } from "@/server/auth/session";
import {
  changePassword,
  confirmTwoFactorEnrollment,
  disableTwoFactor,
  regenerateBackupCodes,
  revokeDeviceSession,
  revokeOtherDeviceSessions,
  startTwoFactorEnrollment,
} from "@/server/services/account-security";

const userRef = (s: Awaited<ReturnType<typeof assertUser>>["session"]) => ({
  id: s.user.id,
  email: s.user.email,
  role: s.user.role as string,
  twoFactorEnabled: s.user.twoFactorEnabled,
});

export async function startTwoFactorAction(_prev: FormState, form: FormData): Promise<FormState> {
  try {
    const { session } = await assertUser();
    const data = await startTwoFactorEnrollment(
      field(form, "password", 200),
      await authHeaders(),
      userRef(session),
    );
    return { ok: true, data };
  } catch (error) {
    return toFormState(error);
  }
}

export async function confirmTwoFactorAction(_prev: FormState, form: FormData): Promise<FormState> {
  try {
    const { session } = await assertUser();
    await confirmTwoFactorEnrollment(
      field(form, "code", 12),
      await authHeaders(),
      userRef(session),
    );
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: (await getTranslations("account.twoFactor"))("enabledNotice"),
      data: { done: true },
    };
  } catch (error) {
    return toFormState(error);
  }
}

export async function regenerateBackupCodesAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const { session } = await assertUser();
    const backupCodes = await regenerateBackupCodes(
      field(form, "password", 200),
      await authHeaders(),
      userRef(session),
    );
    return { ok: true, data: { backupCodes } };
  } catch (error) {
    return toFormState(error);
  }
}

export async function disableTwoFactorAction(_prev: FormState, form: FormData): Promise<FormState> {
  try {
    const { session } = await assertUser();
    await disableTwoFactor(field(form, "password", 200), await authHeaders(), userRef(session));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toFormState(error);
  }
}

export async function changePasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  try {
    const { session } = await assertUser();
    await changePassword(
      {
        currentPassword: field(form, "currentPassword", 200),
        newPassword: field(form, "newPassword", 200),
      },
      await authHeaders(),
      userRef(session),
    );
    revalidatePath("/", "layout");
    return { ok: true, message: (await getTranslations("account.password"))("changed") };
  } catch (error) {
    return toFormState(error);
  }
}

export async function revokeSessionAction(form: FormData): Promise<void> {
  const { session } = await assertUser();
  const id = field(form, "sessionId", 64);
  if (id && id !== session.session.id) await revokeDeviceSession(session.user.id, id);
  revalidatePath("/", "layout");
}

export async function revokeOtherSessionsAction(): Promise<void> {
  const { session } = await assertUser();
  await revokeOtherDeviceSessions(session.user.id, session.session.id);
  revalidatePath("/", "layout");
}
