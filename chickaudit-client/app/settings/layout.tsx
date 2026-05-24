import { AppShell } from "@/components/app/app-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - ChickenAudit",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
