/**
 * Order lifecycle rules, shared by the server (enforced inside the transaction) and the admin UI
 * (which only offers the moves that are allowed).
 *
 *   pending → confirmed → processing → shipped → delivered
 *      ↘ cancelled ↙ (before shipping)          ↘ returned (after shipping)
 */
export const ORDER_FLOW = ["pending", "confirmed", "processing", "shipped", "delivered"] as const;

export type OrderStatusValue =
  "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";

export const STATUS_TRANSITIONS: Record<OrderStatusValue, readonly OrderStatusValue[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "shipped", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export function canTransition(from: OrderStatusValue, to: OrderStatusValue): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

/** Statuses that put the items back on the shelf. */
export const RESTOCKING_STATUSES: readonly OrderStatusValue[] = ["cancelled", "returned"];

/** Orders the team still has to act on. */
export const OPEN_STATUSES: readonly OrderStatusValue[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
];
