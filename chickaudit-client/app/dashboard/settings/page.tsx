"use client";

import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/translations";
import { PageHeader } from "@/components/app/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { UserSettingsTable } from "@/components/settings/UserSettingsTable";
import { FarmSettingsForm } from "@/components/settings/FarmSettingsForm";
import { Loader2, User, Users, Tractor } from "lucide-react";

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const { language } = useLanguage();

  const isOwner = user?.role === "owner";

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Settings", language)}
        subtitle={t("Manage your farm configuration", language)}
      />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 gap-0">
          <TabsTrigger
            value="profile"
            className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground gap-2"
          >
            <User className="w-4 h-4" />
            {t("Profile", language)}
          </TabsTrigger>

          {isOwner && (
            <>
              <TabsTrigger
                value="users"
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground gap-2"
              >
                <Users className="w-4 h-4" />
                {t("Users", language)}
              </TabsTrigger>
              <TabsTrigger
                value="farm"
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground gap-2"
              >
                <Tractor className="w-4 h-4" />
                {t("Farm Settings", language)}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <div className="pt-6">
          <TabsContent value="profile" className="mt-0">
            <ProfileForm />
          </TabsContent>

          {isOwner && (
            <>
              <TabsContent value="users" className="mt-0">
                <UserSettingsTable />
              </TabsContent>
              <TabsContent value="farm" className="mt-0">
                <FarmSettingsForm />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}
