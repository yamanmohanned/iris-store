import type { UserRole } from "@/server/db/schema";

/**
 * Role-based access control. Permissions are checked on the server for every admin action
 * (never only in the UI). Roles are fixed; owners assign them to staff.
 */
export const PERMISSIONS = [
  "dashboard:view",
  "orders:read",
  "orders:write",
  "products:read",
  "products:write",
  "inventory:write",
  "customers:read",
  "customers:write",
  "coupons:write",
  "content:write",
  "shipping:write",
  "settings:write",
  "staff:manage",
  "audit:read",
  "reports:read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  customer: [],
  order_manager: [
    "dashboard:view",
    "orders:read",
    "orders:write",
    "customers:read",
    "products:read",
  ],
  catalog_manager: [
    "dashboard:view",
    "products:read",
    "products:write",
    "inventory:write",
    "content:write",
    "orders:read",
  ],
  admin: PERMISSIONS.filter((p) => p !== "staff:manage"),
  owner: PERMISSIONS,
};

export const STAFF_ROLES: readonly UserRole[] = [
  "order_manager",
  "catalog_manager",
  "admin",
  "owner",
];

export function isStaffRole(role: string | null | undefined): role is UserRole {
  return STAFF_ROLES.includes(role as UserRole);
}

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  if (!role || !(role in ROLE_PERMISSIONS)) return false;
  return ROLE_PERMISSIONS[role as UserRole].includes(permission);
}

export function permissionsOf(role: string | null | undefined): readonly Permission[] {
  return role && role in ROLE_PERMISSIONS ? ROLE_PERMISSIONS[role as UserRole] : [];
}

/** Roles an actor may assign: owners assign anything but owner; admins only the manager roles. */
export function assignableRoles(actorRole: string): UserRole[] {
  if (actorRole === "owner") return ["customer", "order_manager", "catalog_manager", "admin"];
  if (actorRole === "admin") return ["customer", "order_manager", "catalog_manager"];
  return [];
}
