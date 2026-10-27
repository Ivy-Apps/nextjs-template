import { SessionHttpClient } from "@/data/http/SessionHttpClient";
import { currentUserQuery } from "@/features/auth/ui/currentUserQuery";
import { HeaderContainer } from "@/features/auth/ui/HeaderContainer";
import { resolveRequestLocale } from "@/lib/i18n/resolveRequestLocale";
import { PrefetchBoundary } from "@/lib/query/PrefetchBoundary";

/** The pages behind login: `src/proxy.ts` has checked the session. */
export default async function SignedInLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  await resolveRequestLocale(params);

  return (
    <>
      <PrefetchBoundary
        prefetch={(queryClient) =>
          queryClient.prefetchQuery(currentUserQuery(SessionHttpClient))
        }
      >
        <HeaderContainer />
      </PrefetchBoundary>
      {children}
    </>
  );
}
