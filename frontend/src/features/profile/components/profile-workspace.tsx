import { PlatformApiKeysCard } from "@/core/components/platform-api-keys-card";
import { Tabs, TabsContent } from "@/core/components/ui/tabs";

import type { ChangePasswordValues, ProfileData, ProfileFormValues } from "../lib/types";
import { DeleteAccountCard } from "./delete-account-card";
import { PasswordChangeForm } from "./password-change-form";
import { ProfileForm } from "./profile-form";
import { ProfileHeader } from "./profile-header";
import { ProfileTabsList } from "./profile-tabs-list";
import { TotpSetupCard } from "./totp-setup-card";

const TAB_INFO = "info";
const TAB_CONFIG = "config";
const TAB_SECURITY = "security";

interface ProfileActions {
  handleSaveProfile: (values: ProfileFormValues) => Promise<ProfileData | null>;
  handleChangePassword: (values: ChangePasswordValues) => Promise<boolean>;
  handleDeleteAccount: (password: string) => void;
  isSavingProfile: boolean;
  isChangingPassword: boolean;
  isDeletingAccount: boolean;
  deleteError: string;
  resetDeleteError: () => void;
}

interface ProfileWorkspaceProps {
  profile: ProfileData;
  activeTab: string;
  onTabChange: (tab: string) => void;
  actions: ProfileActions;
}

/** Cabecera y pestañas del perfil cuando ya hay datos. */
export function ProfileWorkspace({
  profile,
  activeTab,
  onTabChange,
  actions,
}: Readonly<ProfileWorkspaceProps>) {
  const role = profile.role ?? "usuario";
  const isAdmin = role === "administrador";

  return (
    <>
      <ProfileHeader profile={profile} role={role} isLoading={false} />
      <Tabs value={activeTab} onValueChange={onTabChange} className="flex-col gap-6">
        <ProfileTabsList isAdmin={isAdmin} />
        <TabsContent value={TAB_INFO} className="max-w-3xl">
          <ProfileForm
            profile={profile}
            isSubmitting={actions.isSavingProfile}
            onSave={actions.handleSaveProfile}
          />
        </TabsContent>
        {isAdmin && (
          <TabsContent value={TAB_CONFIG} className="max-w-3xl space-y-6">
            <PlatformApiKeysCard />
          </TabsContent>
        )}
        <TabsContent value={TAB_SECURITY} className="max-w-3xl space-y-6">
          <TotpSetupCard totpEnabled={profile.totp_enabled === true} />
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
    </>
  );
}
