import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { messages } from "@/lib/i18n/messages";
import { routing } from "@/lib/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
  return { locale, messages: messages[locale] };
});
