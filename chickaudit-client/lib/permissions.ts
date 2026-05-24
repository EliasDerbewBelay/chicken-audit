export type AppUser = {
  id: string;
  role: "owner" | "employee";
};

/** Owner: full control. Employee: only their own records. */
export function canManageRecord(
  user: AppUser | null | undefined,
  recordOwnerId: string | null | undefined,
): boolean {
  if (!user || !recordOwnerId) return false;
  if (user.role === "owner") return true;
  return user.id === recordOwnerId;
}
