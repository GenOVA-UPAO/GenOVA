interface FormErrorAlertProps {
  message: string;
}

export function FormErrorAlert({ message }: Readonly<FormErrorAlertProps>) {
  if (message === "") return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
    >
      {message}
    </div>
  );
}
