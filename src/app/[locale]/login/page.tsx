import { Option } from "effect";
import { LoginContainer } from "@/features/auth/ui/LoginContainer";
import { getPathname } from "@/lib/i18n/navigation";
import { resolveRequestLocale } from "@/lib/i18n/resolveRequestLocale";
import {
  parseReturnPath,
  RETURN_PATH_PARAM,
  ReturnPath,
} from "@/types/ReturnPath";
import { ThemeToggle } from "@/ui/ThemeToggle";

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/login">) {
  const locale = await resolveRequestLocale(params);
  const returnTo = (await searchParams)[RETURN_PATH_PARAM];
  const destination = parseReturnPath(
    typeof returnTo === "string" ? returnTo : null,
  ).pipe(
    Option.getOrElse(() => ReturnPath.make(getPathname({ href: "/", locale }))),
  );

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <ThemeToggle />
      <LoginContainer destination={destination} />
    </main>
  );
}
