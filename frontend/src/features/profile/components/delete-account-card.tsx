import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";

import { DeleteAccountModal } from "./delete-account-modal";
import { ProfileSection } from "./profile-section";

interface DeleteAccountCardProps {
  isSubmitting: boolean;
  serverError: string;
  onDelete: (password: string) => void;
  onDismissError: () => void;
}

export function DeleteAccountCard({
  isSubmitting,
  serverError,
  onDelete,
  onDismissError,
}: Readonly<DeleteAccountCardProps>) {
  const { t } = useTranslation("profile");
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ProfileSection
      tone="danger"
      title={t("delete.title")}
      description={t("delete.description")}
    >
      <Button
        variant="destructive"
        className="max-sm:h-11 max-sm:w-full"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        {t("delete.button")}
      </Button>

      {isOpen && (
        <DeleteAccountModal
          isSubmitting={isSubmitting}
          serverError={serverError}
          onDelete={onDelete}
          onClose={() => {
            setIsOpen(false);
            onDismissError();
          }}
        />
      )}
    </ProfileSection>
  );
}
