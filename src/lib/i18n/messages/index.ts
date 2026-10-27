import type { Locale } from "next-intl";
import { bg } from "@/lib/i18n/messages/bg";
import { en, type Messages } from "@/lib/i18n/messages/en";

export type { Messages };

export const messages: Record<Locale, Messages> = { en, bg };
