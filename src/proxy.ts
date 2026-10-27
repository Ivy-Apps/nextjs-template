import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  // Seam for the BFF: guard protected pages (redirect to login) and renew
  // the session here, before the request reaches i18n routing.
  return handleI18nRouting(request);
}

export const config = {
  // Pages only: skip the BFF routes (/api, /proxy), Next internals and files.
  matcher: "/((?!api|proxy|_next|_vercel|.*\\..*).*)",
};
