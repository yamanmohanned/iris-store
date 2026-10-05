import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/misc";
import type { OrderStatus } from "@/server/db/schema";

const TONES: Record<
  OrderStatus,
  "warning" | "info" | "primary" | "success" | "danger" | "neutral"
> = {
  pending: "warning",
  confirmed: "info",
  processing: "info",
  shipped: "primary",
  delivered: "success",
  cancelled: "danger",
  returned: "neutral",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations("order.statuses");
  return <Badge tone={TONES[status]}>{t(status)}</Badge>;
}
