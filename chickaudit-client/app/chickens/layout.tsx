import { AuthProvider } from "@/lib/auth-context";
import { AppShell } from "@/components/app/app-shell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
