interface PlatformKeyRowMessagesProps {
  /** El usuario pulsó «Guardar clave» con el campo vacío. */
  missingKey: boolean;
  /** id del aviso «falta la clave», al que apunta el campo. */
  errorId: string;
  providerLabel: string;
  saveError: Error | null;
}

export function PlatformKeyRowMessages({
  missingKey,
  errorId,
  providerLabel,
  saveError,
}: Readonly<PlatformKeyRowMessagesProps>) {
  return (
    <>
      {missingKey && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          Pega la clave de {providerLabel} para guardarla.
        </p>
      )}
      {saveError !== null && (
        <p role="alert" className="text-xs text-destructive">
          {saveError.message}
        </p>
      )}
    </>
  );
}
