import { LogInIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { LoginFields } from "@/features/auth/ui/useLoginViewModel.types";
import { Button } from "@/ui/design-system/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/design-system/components/card";
import { Input } from "@/ui/design-system/components/input";
import { Label } from "@/ui/design-system/components/label";

type LoginFormProps = {
  fields: LoginFields;
  submit: "Ready" | "Busy";
  /** Why the last attempt failed, shown above the button. */
  alert: ReactNode;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

export function LoginForm({
  fields,
  submit,
  alert,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  const t = useTranslations("login");
  const busy = submit === "Busy";

  return (
    <Card className="w-full max-w-sm">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <CardHeader>
          <CardTitle>
            <h1>{t("title")}</h1>
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">{t("username")}</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              required
              value={fields.username}
              onChange={(event) => onUsernameChange(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={fields.password}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground">{t("demoAccount")}</p>
          {alert}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={busy}>
            <LogInIcon />
            {busy ? t("submitting") : t("submit")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
