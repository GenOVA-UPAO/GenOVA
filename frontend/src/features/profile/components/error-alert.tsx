interface ErrorAlertProps {
  message: string;
}

export function ErrorAlert({ message }: Readonly<ErrorAlertProps>) {
  if (message === "") return null;

  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
    >
      {message}
    </p>
  );
}
