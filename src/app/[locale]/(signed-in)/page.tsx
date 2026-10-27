import { SessionHttpClient } from "@/data/http/SessionHttpClient";
import { TodosContainer } from "@/features/todos/ui/TodosContainer";
import { todosQuery } from "@/features/todos/ui/todosQuery";
import { resolveRequestLocale } from "@/lib/i18n/resolveRequestLocale";
import { PrefetchBoundary } from "@/lib/query/PrefetchBoundary";

/** The signed-in user's todos, on the first paint. */
export default async function TodosPage({ params }: PageProps<"/[locale]">) {
  await resolveRequestLocale(params);

  return (
    <main className="flex flex-1 flex-col items-center p-4">
      <PrefetchBoundary
        prefetch={(queryClient) =>
          queryClient.prefetchQuery(todosQuery(SessionHttpClient))
        }
      >
        <TodosContainer />
      </PrefetchBoundary>
    </main>
  );
}
