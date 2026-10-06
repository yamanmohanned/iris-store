"use client";

import {
  FileText,
  FolderTree,
  LayoutDashboard,
  LayoutTemplate,
  Menu,
  Package,
  ReceiptText,
  ScrollText,
  Settings,
  TicketPercent,
  Truck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type NavKey =
  | "dashboard"
  | "orders"
  | "customers"
  | "coupons"
  | "products"
  | "categories"
  | "home"
  | "pages"
  | "shipping"
  | "settings"
  | "staff"
  | "audit";

type Item = { key: NavKey; href: string; icon: LucideIcon; permission: string; exact?: boolean };

const GROUPS: { key: "sales" | "catalog" | "store" | "team"; items: Item[] }[] = [
  {
    key: "sales",
    items: [
      {
        key: "dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        permission: "dashboard:view",
        exact: true,
      },
      { key: "orders", href: "/admin/orders", icon: ReceiptText, permission: "orders:read" },
      { key: "customers", href: "/admin/customers", icon: Users, permission: "customers:read" },
      { key: "coupons", href: "/admin/coupons", icon: TicketPercent, permission: "coupons:write" },
    ],
  },
  {
    key: "catalog",
    items: [
      { key: "products", href: "/admin/products", icon: Package, permission: "products:read" },
      {
        key: "categories",
        href: "/admin/categories",
        icon: FolderTree,
        permission: "products:write",
      },
    ],
  },
  {
    key: "store",
    items: [
      { key: "home", href: "/admin/storefront", icon: LayoutTemplate, permission: "content:write" },
      { key: "pages", href: "/admin/pages", icon: FileText, permission: "content:write" },
      { key: "shipping", href: "/admin/shipping", icon: Truck, permission: "shipping:write" },
      { key: "settings", href: "/admin/settings", icon: Settings, permission: "settings:write" },
    ],
  },
  {
    key: "team",
    items: [
      { key: "staff", href: "/admin/staff", icon: UserCog, permission: "staff:manage" },
      { key: "audit", href: "/admin/audit", icon: ScrollText, permission: "audit:read" },
    ],
  },
];

/**
 * Sidebar navigation, filtered by the staff member's permissions (the server enforces them again
 * on every page and action).
 */
export function AdminNav({
  permissions,
  badges = {},
  onNavigate,
}: {
  permissions: string[];
  badges?: Partial<Record<string, number>>;
  onNavigate?: () => void;
}) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const allowed = new Set(permissions);
  return (
    <nav aria-label={t("menu")} className="space-y-5">
      {GROUPS.map((group) => {
        const items = group.items.filter((i) => allowed.has(i.permission));
        if (items.length === 0) return null;
        return (
          <div key={group.key}>
            <p className="mb-1.5 px-3 text-[0.7rem] font-semibold tracking-wide text-muted-foreground">
              {t(`navGroups.${group.key}`)}
            </p>
            <ul className="space-y-0.5">
              {items.map(({ key, href, icon: Icon, exact }) => {
                const active = exact
                  ? pathname === href
                  : pathname === href || pathname.startsWith(`${href}/`);
                const badge = badges[key];
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary-soft text-primary"
                          : "text-foreground/80 hover:bg-surface-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-[1.1rem] shrink-0" aria-hidden="true" />
                      <span className="flex-1">{t(`nav.${key}`)}</span>
                      {badge ? (
                        <span className="min-w-5 rounded-full bg-accent px-1.5 text-center text-xs font-bold text-accent-foreground tabular">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

/** Phones and tablets: the same navigation in a drawer from the reading-start side. */
export function MobileAdminNav(props: Omit<Parameters<typeof AdminNav>[0], "onNavigate">) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-surface-muted"
          aria-label={t("menu")}
        >
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="start" title={t("title")} closeLabel={t("menu")}>
        <div className="px-2 pb-6">
          <AdminNav {...props} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
