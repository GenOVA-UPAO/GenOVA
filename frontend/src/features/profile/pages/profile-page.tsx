import { useState } from "react";

import { PlatformApiKeysCard } from "@/core/components/platform-api-keys-card";
import { Tabs, TabsContent } from "@/core/components/ui/tabs";

import { DeleteAccountCard } from "../components/delete-account-card";
import { PasswordChangeForm } from "../components/password-change-form";
import { ProfileForm } from "../components/profile-form";
import { ProfileHeader } from "../components/profile-header";
import { ProfileSkeleton } from "../components/profile-skeleton";
import { ProfileTabsList } from "../components/profile-tabs-list";
import { TotpSetupCard } from "../components/totp-setup-card";
import { useProfile } from "../hooks/use-profile";
import { useProfileActions } from "../hooks/use-profile-actions";

const TAB_INFO = "info";
const TAB_CONFIG = "config";
const TAB_SECURITY = "security";

export function ProfilePage() {
  const profileQuery = useProfile();
  const actions = useProfileActions();
  const [tab, setTab] = useState(TAB_INFO);

  const profile = profileQuery.data ?? null;
  const role = profile?.role ?? "usuario";
  const isAdmin = role === "administrador";
  const activeTab = tab === TAB_CONFIG && !isAdmin ? TAB_INFO : tab;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <ProfileHeader profile={profile} role={role} isLoading={profileQuery.isLoading} />
      {profileQuery.isLoading ? (
        <ProfileSkeleton />
      ) : (
        <Tabs value={activeTab} onValueChange={setTab} className="flex-col space-y-5">
          <ProfileTabsList isAdmin={isAdmin} />
          <TabsContent value={TAB_INFO} className="mt-0">
            <ProfileForm
              profile={profile}
              isSubmitting={actions.isSavingProfile}
              onSave={actions.handleSaveProfile}
            />
          </TabsContent>
          {isAdmin && (
            <TabsContent value={TAB_CONFIG} className="mt-0 space-y-5">
              <PlatformApiKeysCard />
            </TabsContent>
          )}
          <TabsContent value={TAB_SECURITY} className="mt-0 space-y-5">
            <TotpSetupCard totpEnabled={profile?.totp_enabled === true} />
            <PasswordChangeForm
              isSubmitting={actions.isChangingPassword}
              onSave={actions.handleChangePassword}
            />
            <DeleteAccountCard
              isSubmitting={actions.isDeletingAccount}
              serverError={actions.deleteError}
              onDelete={actions.handleDeleteAccount}
              onDismissError={actions.resetDeleteError}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
