/** Result of a form Server Action, consumed by `useActionState` on the client. */
export type FormState = {
  ok: boolean;
  /** Translated, user-facing summary message. */
  message?: string;
  /** Translated messages keyed by field name. */
  fieldErrors?: Record<string, string>;
  /** Echo of non-secret inputs so the form can be re-filled after an error. */
  values?: Record<string, string>;
  /** Seconds until the action may be retried (rate limits). */
  retryAfter?: number;
  /** Extra result data for multi-step forms (e.g. 2FA enrollment QR code). */
  data?: Record<string, unknown>;
} | null;

export const initialFormState: FormState = null;
