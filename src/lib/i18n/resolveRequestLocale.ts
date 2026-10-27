import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";

/**
 * Validates the `[locale]` route param and enables static rendering for it.
 * Call it first in every layout and page under `src/app/[locale]`; an unknown
 * locale renders the 404 page.
 */
export async function resolveRequestLocale(
  params: Promise<{ locale: string }>,
): Promise<Locale> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return locale;
}
