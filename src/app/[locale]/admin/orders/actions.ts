"use server";

import { refresh } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { FormState } from "@/lib/form-state";
import { field, toFormState } from "@/server/action-errors";
import { assertStaff } from "@/server/auth/session";
import { isAppError } from "@/server/errors";
import {
  addOrderNote,
  setInternalNote,
  updateOrderStatus,
  updatePaymentStatus,
  type paymentChangeSchema,
  type statusChangeSchema,
} from "@/server/services/admin-orders";
import { kickOutbox } from "@/server/services/outbox";
import type { z } from "zod";

export type AdminActionResult = { ok: boolean; message?: string };

async function staleOr(error: unknown): Promise<AdminActionResult> {
  const t = await getTranslations("admin.orders.detail");
  if (isAppError(error) && error.code === "CONFLICT") {
    refresh();
    return { ok: false, message: t("stale") };
  }
  const state = await toFormState(error);
  return { ok: false, message: state?.message ?? Object.values(state?.fieldErrors ?? {})[0] };
}

/** Move an order to another status (validated again inside the transaction). */
export async function changeOrderStatusAction(
  input: z.input<typeof statusChangeSchema>,
): Promise<AdminActionResult> {
  try {
    const { actor } = await assertStaff("orders:write");
    await updateOrderStatus(input, actor);
  } catch (error) {
    return staleOr(error);
  }
  kickOutbox();
  refresh();
  return { ok: true, message: (await getTranslations("admin.orders.detail"))("updated") };
}

export async function changePaymentStatusAction(
  input: z.input<typeof paymentChangeSchema>,
): Promise<AdminActionResult> {
  try {
    const { actor } = await assertStaff("orders:write");
    await updatePaymentStatus(input, actor);
  } catch (error) {
    return staleOr(error);
  }
  refresh();
  return { ok: true, message: (await getTranslations("admin.orders.detail"))("updated") };
}

export async function addOrderNoteAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { message: field(form, "message", 1000) };
  try {
    const { actor } = await assertStaff("orders:write");
    await addOrderNote(
      {
        orderId: field(form, "orderId", 40),
        message: values.message,
        customerVisible: form.get("customerVisible") === "on",
      },
      actor,
    );
  } catch (error) {
    return toFormState(error, values);
  }
  refresh();
  return { ok: true, message: (await getTranslations("admin.orders.detail"))("noteAdded") };
}

export async function saveInternalNoteAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { note: field(form, "note", 2000) };
  try {
    const { actor } = await assertStaff("orders:write");
    await setInternalNote(field(form, "orderId", 40), values.note, actor);
  } catch (error) {
    return toFormState(error, values);
  }
  refresh();
  return { ok: true, message: (await getTranslations("admin.orders.detail"))("noteSaved"), values };
}
