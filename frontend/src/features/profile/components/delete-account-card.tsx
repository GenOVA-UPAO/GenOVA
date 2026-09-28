import { useState } from "react";

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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ProfileSection
      tone="danger"
      title="Eliminar cuenta"
      description="Se desactiva tu cuenta y se anonimizan tus datos personales. Tus OVAs se conservan sin tu autoría. No se puede deshacer."
    >
      <Button
        variant="destructive"
        className="max-sm:h-11 max-sm:w-full"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        Eliminar cuenta
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
