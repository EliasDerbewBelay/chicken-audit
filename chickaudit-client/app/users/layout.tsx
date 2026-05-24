import { AppShell } from "@/components/app/app-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users Management - ChickenAudit",
};

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}