export const appRoles = ["student", "lecturer", "department", "administrator"] as const;
export type AppRole = (typeof appRoles)[number];

export const roleHome: Record<AppRole, string> = {
  student: "/portal/student",
  lecturer: "/portal/lecturer",
  department: "/portal/department",
  administrator: "/portal/administrator",
};

export function isAppRole(value: string): value is AppRole { return appRoles.includes(value as AppRole); }
