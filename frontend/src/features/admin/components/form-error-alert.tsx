interface FormErrorAlertProps {
  message: string;
}

export function FormErrorAlert({ message }: Readonly<FormErrorAlertProps>) {
  if (message === "") return null;

  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
