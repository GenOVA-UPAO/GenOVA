import { Link } from "react-router";

import { Button } from "@/core/components/ui/button";

import { ServerAlert } from "./server-alert";

interface AuthSuccessPanelProps {
  message: string;
  href: string;
  actionLabel: string;
}

export function AuthSuccessPanel({ message, href, actionLabel }: Readonly<AuthSuccessPanelProps>) {
  return (
    <div className="mt-6 space-y-4">
      <ServerAlert tone="success">{message}</ServerAlert>
      <Button asChild className="w-full">
        <Link to={href}>{actionLabel}</Link>
      </Button>
    </div>
  );
}
