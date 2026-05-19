import { AuthProvider } from "@/lib/auth-context";
import { AppShell } from "@/components/app/app-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users Management - ChickAudit",
};

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}