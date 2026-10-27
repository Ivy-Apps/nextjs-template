import { Effect } from "effect";
import type { NextRequest } from "next/server";
import { passThrough } from "@/data/bff/passThrough";
import { BackendHttpClient } from "@/data/http/BackendHttpClient";

/** The browser's door to the backend; see `passThrough`. */
async function handler(
  request: NextRequest,
  context: RouteContext<"/proxy/[...path]">,
) {
  const { path } = await context.params;
  return Effect.runPromise(
    passThrough(request, path).pipe(Effect.provide(BackendHttpClient)),
  );
}

export {
  handler as DELETE,
  handler as GET,
  handler as HEAD,
  handler as OPTIONS,
  handler as PATCH,
  handler as POST,
  handler as PUT,
};
