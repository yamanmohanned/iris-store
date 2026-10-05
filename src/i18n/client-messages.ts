import "server-only";
import { getMessages } from "next-intl/server";

type Messages = Awaited<ReturnType<typeof getMessages>>;

/** Shared by every page's client components. */
export const BASE_CLIENT_NAMESPACES = ["common", "nav", "errors"] as const;

/** Subset of messages to ship to the browser (keeps client payloads small). */
export async function pickClientMessages(...extra: (keyof Messages)[]): Promise<Partial<Messages>> {
  const messages = await getMessages();
  const keys = [...BASE_CLIENT_NAMESPACES, ...extra] as (keyof Messages)[];
  return Object.fromEntries(keys.map((ns) => [ns, messages[ns]])) as Partial<Messages>;
}
