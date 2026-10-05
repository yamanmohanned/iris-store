import "server-only";
import { sql } from "drizzle-orm";
import type { LocalizedText } from "@/lib/localized";
import { db } from "@/server/db/client";
import { getSettings } from "./settings";

export type DashboardStats = {
  ordersToday: number;
  revenueToday: number;
  orders7d: number;
  revenue7d: number;
  pending: number;
  toShip: number;
  lowStockCount: number;
  /** Last 14 days in the store's time zone, oldest first (cancelled/returned excluded). */
  daily: { day: string; orders: number; revenue: number }[];
  topProducts: { name: LocalizedText; units: number; revenue: number }[];
  lowStock: { productId: string; name: LocalizedText; options: string[]; stock: number }[];
};

/** Numbers for the dashboard home. Days follow the store's time zone, not the server's. */
export async function dashboardStats(): Promise<DashboardStats> {
  const { general, notifications } = await getSettings();
  const tz = general.timeZone;
  const today = sql`(date_trunc('day', now() at time zone ${tz}) at time zone ${tz})`;
  const counted = sql`status not in ('cancelled', 'returned')`;

  const [totals, daily, top, low] = await Promise.all([
    db.execute<{
      orders_today: number;
      revenue_today: number;
      orders_7d: number;
      revenue_7d: number;
      pending: number;
      to_ship: number;
    }>(sql`
      select
        count(*) filter (where placed_at >= ${today} and ${counted})::int as orders_today,
        coalesce(sum(grand_total) filter (where placed_at >= ${today} and ${counted}), 0)::bigint as revenue_today,
        count(*) filter (where placed_at >= ${today} - interval '6 days' and ${counted})::int as orders_7d,
        coalesce(sum(grand_total) filter (where placed_at >= ${today} - interval '6 days' and ${counted}), 0)::bigint as revenue_7d,
        count(*) filter (where status = 'pending')::int as pending,
        count(*) filter (where status in ('confirmed', 'processing'))::int as to_ship
      from orders
    `),
    db.execute<{ day: string; orders: number; revenue: number }>(sql`
      select to_char(d, 'YYYY-MM-DD') as day,
             count(o.id)::int as orders,
             coalesce(sum(o.grand_total), 0)::bigint as revenue
      from generate_series(
        date_trunc('day', now() at time zone ${tz}) - interval '13 days',
        date_trunc('day', now() at time zone ${tz}),
        interval '1 day'
      ) d
      left join orders o
        on (o.placed_at at time zone ${tz}) >= d
       and (o.placed_at at time zone ${tz}) < d + interval '1 day'
       and o.status not in ('cancelled', 'returned')
      group by d
      order by d
    `),
    db.execute<{ name: LocalizedText; units: number; revenue: number }>(sql`
      select (array_agg(oi.product_name order by o.placed_at desc))[1] as name,
             sum(oi.quantity)::int as units,
             sum(oi.line_total)::bigint as revenue
      from order_items oi
      join orders o on o.id = oi.order_id
      where o.placed_at >= now() - interval '30 days' and o.status not in ('cancelled', 'returned')
      group by coalesce(oi.product_id::text, oi.product_name->>'ar')
      order by units desc, revenue desc
      limit 5
    `),
    db.execute<{
      product_id: string;
      name: LocalizedText;
      option_ids: string[];
      stock: number;
      total: number;
    }>(sql`
      select p.id as product_id, p.name, v.option_value_ids as option_ids, v.stock_quantity as stock,
             count(*) over ()::int as total
      from product_variants v
      join products p on p.id = v.product_id
      where p.status = 'active' and v.is_active and v.track_inventory
        and v.stock_quantity <= coalesce(v.low_stock_threshold, ${notifications.lowStockThreshold})
      order by v.stock_quantity asc, p.name->>'ar'
      limit 8
    `),
  ]);

  const t = totals.rows[0]!;
  // Option labels for the low-stock list ("M", "أسود") without loading whole products.
  const lowRows = low.rows;
  const labels = new Map<string, string>();
  if (lowRows.length) {
    const options = await db.execute<{ values: { id: string; label: LocalizedText }[] }>(sql`
      select "values" from product_options
      where product_id in ${[...new Set(lowRows.map((r) => r.product_id))]}
    `);
    for (const o of options.rows)
      for (const v of o.values) labels.set(v.id, v.label.ar || v.label.en || "");
  }

  return {
    ordersToday: t.orders_today,
    revenueToday: Number(t.revenue_today),
    orders7d: t.orders_7d,
    revenue7d: Number(t.revenue_7d),
    pending: t.pending,
    toShip: t.to_ship,
    lowStockCount: lowRows[0]?.total ?? 0,
    daily: daily.rows.map((r) => ({ day: r.day, orders: r.orders, revenue: Number(r.revenue) })),
    topProducts: top.rows.map((r) => ({
      name: r.name,
      units: r.units,
      revenue: Number(r.revenue),
    })),
    lowStock: lowRows.map((r) => ({
      productId: r.product_id,
      name: r.name,
      options: (r.option_ids ?? []).map((id) => labels.get(id) ?? "").filter(Boolean),
      stock: r.stock,
    })),
  };
}
