import { LogOutIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LogoutState } from "@/features/auth/ui/useHeaderViewModel.types";
import { Alert, AlertDescription } from "@/ui/design-system/components/alert";
import { Button } from "@/ui/design-system/components/button";

type LogoutButtonProps = {
  status: LogoutState;
  onLogOut: () => void;
};

export function LogoutButton({ status, onLogOut }: LogoutButtonProps) {
  const t = useTranslations("header");

  return (
    <div className="flex items-center gap-2">
      {status === "Failed" && (
        <Alert variant="destructive" className="w-auto">
          <AlertDescription>{t("logoutFailed")}</AlertDescription>
        </Alert>
      )}
      <Button
        variant="outline"
        disabled={status === "Pending"}
        onClick={onLogOut}
      >
        <LogOutIcon />
        {status === "Pending" ? t("loggingOut") : t("logout")}
      </Button>
    </div>
  );
}
