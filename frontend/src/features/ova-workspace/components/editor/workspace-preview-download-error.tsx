import { Icon } from "@/core/components/icon";

export function WorkspacePreviewDownloadError({ message }: Readonly<{ message: string }>) {
  return (
    <p
      role="alert"
      className="absolute top-full right-0 z-10 mt-1 flex max-w-72 items-start gap-1.5 rounded-md border border-destructive/30 bg-card px-2.5 py-1.5 text-xs text-destructive shadow-md dark:bg-destructive/15"
    >
      <Icon name="warning-circle" className="mt-0.5 size-3.5 shrink-0" />
      <span className="min-w-0 break-words">{message}</span>
    </p>
  );
}
