import { getTranslations } from "next-intl/server";
import { resolveRequestLocale } from "@/lib/i18n/resolveRequestLocale";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/design-system/components/card";
import { ThemeToggle } from "@/ui/ThemeToggle";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  await resolveRequestLocale(params);
  const t = await getTranslations("home");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <ThemeToggle />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1>{t("title")}</h1>
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
