interface ErrorAlertProps {
  message: string;
}

export function ErrorAlert({ message }: Readonly<ErrorAlertProps>) {
  if (message === "") return null;

  return (
    <div>
      <div className="relative w-full rounded-lg border border-destructive/50 p-4 text-destructive">
        <div className="text-sm">{message}</div>
      </div>
    </div>
  );
}
